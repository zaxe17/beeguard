# services/cv_scan_service.py

"""
Bee/insect species identification via a LOCAL YOLO model (Config.CV_SCAN_MODEL_PATH,
e.g. yolo12n.pt), run in-process with ultralytics — no external API call anymore
(previously this hit a Roboflow-hosted workflow over HTTP).

Images are saved to LOCAL DISK under Config.CV_SCAN_UPLOAD_FOLDER, and served
back out under Config.CV_SCAN_URL_PREFIX — cv_scans.image_url stores that URL
path, not a filesystem path.

MAJORITY-VOTING / CONSENSUS POST-PROCESSING
--------------------------------------------
A swarm/colony photo is biologically expected to be a single species — it isn't
realistically possible for two different species to be mixed into one swarm. So
rather than trusting whichever single box happened to score the highest
confidence (which could just be one misclassified outlier), every detected box
is tallied by class, and the DOMINANT (most frequent) class is reported as the
swarm's actual species. The reported confidence_score is the percentage of ALL
detected boxes that agree with that dominant class, discounted by how confident
the model actually was in that class — e.g. 9 boxes read "Apis cerana" and 1
stray box reads "Apis mellifera" -> species "Apis cerana", with that one
mellifera box treated as a likely misclassification rather than a real second
species.

UNIDENTIFIED BEES (NEW) — e.g. Apis dorsata
-------------------------------------------
best.pt (trained 2026-09-29) has 4 classes:
    0 "Apis Cerana"   1 "Apis Mellifera"   2 "Other Bee"   3 "Tetragonula biroi"
Apis dorsata (giant honey bee) and other species were trained into
"Other Bee", so the model RECOGNIZES them instead of mistaking them for
cerana / mellifera. BeeGuard only names the three species above; any other
winning class comes back as identified_species = "Unidentified" (with the
model's confidence), so the app shows "Unidentified Bee" and the citizen can
still submit the report. The report is saved with
ai_species_identified = "Unidentified" (notifications say "A bee colony").
  CV_SCAN_ACCEPTED_CLASSES  comma-separated, matched loosely (any case,
                            "_" or " ", part of the class name). Default:
                            "cerana,mellifera,biroi".
The server log shows "[CVSCAN] Unidentified bee: ..." when this happens.

A bee the model was NOT trained on often gets only low-confidence boxes
(below CV_SCAN_CONF_THRESHOLD, default 0.4), which used to end up as
"No bee detected". So the model now runs with a lower floor:
  CV_SCAN_BEE_MIN_CONF  default 0.15 — any box at or above this means
                        "there is a bee in the photo".
  - boxes >= CV_SCAN_CONF_THRESHOLD -> majority vote as before; winner not
    cerana / mellifera / biroi -> "Unidentified".
  - only weaker boxes (between the two values) -> "Unidentified".
  - no box at all -> no species ("No bee detected" + Retake Photo).
Raise CV_SCAN_BEE_MIN_CONF if non-bee photos start showing as
"Unidentified Bee"; lower it if real bees still show "No bee detected".
"""
import os
import threading
import uuid

from werkzeug.utils import secure_filename

from config.config import Config
from config.database import Database
from models.cv_scan import CVScanModel

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

# See "UNIDENTIFIED BEES" above.
UNIDENTIFIED_SPECIES = "Unidentified"
ACCEPTED_CLASSES = [
    c.strip().lower().replace("_", " ")
    for c in os.getenv("CV_SCAN_ACCEPTED_CLASSES", "cerana,mellifera,biroi").split(",")
    if c.strip()
]


# Lowest box confidence that still counts as "a bee is in the photo".
BEE_MIN_CONF = float(os.getenv("CV_SCAN_BEE_MIN_CONF", "0.15"))


def _is_accepted_class(name: str | None) -> bool:
    n = (name or "").lower().replace("_", " ")
    return any(a in n for a in ACCEPTED_CLASSES)


MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB

# Large images take longer to run through the model, so oversized uploads are
# shrunk before inference — keeps requests fast without visibly hurting
# detection quality.
MAX_IMAGE_DIMENSION = 1600
JPEG_QUALITY = 85

# Loaded once per process and reused across requests — reloading the weights
# file from disk on every scan would be needlessly slow.
_model = None
_model_lock = threading.Lock()


def _get_model():
    global _model
    if _model is not None:
        return _model

    with _model_lock:
        if _model is None:
            if not os.path.exists(Config.CV_SCAN_MODEL_PATH):
                raise ValueError(
                    f"CV identification is not configured (model weights not "
                    f"found at {Config.CV_SCAN_MODEL_PATH})."
                )
            try:
                from ultralytics import YOLO
            except ImportError as e:
                raise ValueError(
                    "CV identification is not configured (ultralytics package "
                    "not installed — add 'ultralytics' to requirements.txt)."
                ) from e

            _model = YOLO(Config.CV_SCAN_MODEL_PATH)
    return _model


def _file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _downscale_image(image_path: str) -> None:
    """
    Shrinks an oversized upload IN PLACE before it's run through the model.
    No-ops if Pillow isn't installed or the image is already small — this is
    an optimization, never something a scan should fail over.
    """
    try:
        from PIL import Image
    except ImportError:
        print("[CVSCAN] Pillow not installed; skipping image downscale.")
        return

    try:
        with Image.open(image_path) as img:
            if max(img.size) <= MAX_IMAGE_DIMENSION:
                return
            img = img.convert("RGB")
            img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.LANCZOS)
            img.save(image_path, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    except Exception as e:
        print(f"[CVSCAN] Image downscale failed, continuing with original: {e}")


def _majority_vote(predictions: list[dict]) -> dict:
    """
    Tallies every detected box by class and returns the dominant
    (most frequent) class, its agreement percentage across ALL boxes,
    and a per-class breakdown.
    """
    tally: dict[str, int] = {}
    confidence_sum: dict[str, float] = {}

    for p in predictions:
        cls = p.get("class")
        conf = float(p.get("confidence", 0))
        tally[cls] = tally.get(cls, 0) + 1
        confidence_sum[cls] = confidence_sum.get(cls, 0.0) + conf

    dominant_species = max(tally, key=lambda c: tally[c])
    dominant_count = tally[dominant_species]
    total_count = len(predictions)

    # % of ALL detected boxes that agree with the dominant class —
    # meaningful for a multi-bee swarm photo, but for a single
    # detection (dominant_count == total_count == 1) this is ALWAYS
    # 100%, regardless of how confident the model actually was.
    agreement_pct = round((dominant_count / total_count) * 100, 2)

    # Actual model confidence for the dominant class, averaged across
    # the boxes that voted for it.
    dominant_avg_confidence = round(
        (confidence_sum[dominant_species] / dominant_count) * 100, 2
    )

    # Composite: discounts agreement_pct by how confident the model
    # actually was in the dominant class. Equals dominant_avg_confidence
    # when every box agrees (the common single-bee case), and drops
    # further when there's real disagreement across boxes — so this no
    # longer reports a flat 100% just because only one bee was found.
    confidence_score = round((agreement_pct / 100) * dominant_avg_confidence, 2)

    species_breakdown = [
        {
            "class": cls,
            "count": count,
            "avg_confidence": round((confidence_sum[cls] / count) * 100, 2),
        }
        for cls, count in sorted(tally.items(), key=lambda kv: -kv[1])
    ]

    return {
        "identified_species": dominant_species,
        "confidence_score": confidence_score,
        "species_breakdown": species_breakdown,
    }


class CVScanService:

    # ── Core inference ──────────────────────────
    @staticmethod
    def identify_species(image_path: str) -> dict:
        """
        Runs the local YOLO model on one image (local path) and returns the
        majority-vote species across all detected boxes.
        """
        model = _get_model()

        try:
            results = model.predict(
                source=image_path,
                imgsz=Config.CV_SCAN_IMGSZ,
                # Low floor so weak boxes (a bee the model doesn't know)
                # are kept; split by CV_SCAN_CONF_THRESHOLD below.
                conf=min(BEE_MIN_CONF, Config.CV_SCAN_CONF_THRESHOLD),
                device=Config.CV_SCAN_DEVICE,
                verbose=False,
            )
        except Exception as e:
            print(f"[CVSCAN] Local YOLO inference failed: {e}")
            raise ValueError(
                "Identification failed. Please try again."
            ) from e

        predictions: list[dict] = []
        if results:
            result = results[0]
            names = result.names
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = [round(v, 2) for v in box.xyxy[0].tolist()]
                    predictions.append({
                        "class": names.get(cls_id, str(cls_id)),
                        "confidence": conf,
                        "bbox": xyxy,
                    })

        if not predictions:
            print("[CVSCAN] No bee detected")
            return {
                "identified_species": None,
                "confidence_score": None,
                "detections": [],
                "species_breakdown": [],
            }

        # Confident boxes decide the species; weaker ones only prove a bee
        # is there (-> "Unidentified").
        confident = [
            p for p in predictions
            if p["confidence"] >= Config.CV_SCAN_CONF_THRESHOLD
        ]
        vote = _majority_vote(confident or predictions)

        # Diagnostic: shows exactly what the model detected per class before
        # majority-vote picks a winner — check this in the server logs if the
        # reported species looks wrong.
        print(
            f"[CVSCAN] Detected {len(predictions)} box(es), "
            f"{len(confident)} confident: {vote['species_breakdown']}"
        )

        # Only weak boxes, or the winner isn't cerana / mellifera / biroi
        # (e.g. "Other Bee" = Apis dorsata) -> "Unidentified" bee; the
        # citizen can still submit the report.
        if not confident or not _is_accepted_class(vote["identified_species"]):
            print(f"[CVSCAN] Unidentified bee: {vote['identified_species']}")
            return {
                "identified_species": UNIDENTIFIED_SPECIES,
                "confidence_score": vote["confidence_score"],
                "detections": predictions,
                "species_breakdown": vote["species_breakdown"],
            }

        return {
            "identified_species": vote["identified_species"],
            "confidence_score": vote["confidence_score"],
            "detections": confident,
            "species_breakdown": vote["species_breakdown"],
        }

    # ── Full upload -> identify -> record flow ──
    @staticmethod
    def scan_and_record(citizen_id: str | None, file_storage) -> dict:
        """
        `file_storage`: a Werkzeug FileStorage from request.files["image"].
        `citizen_id` may be None — guest scans are allowed by the schema.
        """
        filename = file_storage.filename or ""
        ext = _file_extension(filename)
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext or 'unknown'}'. "
                f"Allowed: {sorted(ALLOWED_EXTENSIONS)}."
            )

        # Seek to end, check size, then rewind before saving.
        file_storage.stream.seek(0, os.SEEK_END)
        size = file_storage.stream.tell()
        file_storage.stream.seek(0)
        if size > MAX_UPLOAD_BYTES:
            raise ValueError(
                f"File is too large ({size / 1024 / 1024:.1f} MB). "
                f"Max allowed is {MAX_UPLOAD_BYTES / 1024 / 1024:.0f} MB."
            )

        os.makedirs(Config.CV_SCAN_UPLOAD_FOLDER, exist_ok=True)

        safe_name = secure_filename(filename) or "upload.jpg"
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"
        disk_path = os.path.join(Config.CV_SCAN_UPLOAD_FOLDER, unique_name)
        file_storage.save(disk_path)
        _downscale_image(disk_path)

        image_url = f"{Config.CV_SCAN_URL_PREFIX}/{unique_name}"

        try:
            detection = CVScanService.identify_species(disk_path)
        except Exception:
            # Don't leave orphaned files on disk when inference fails.
            try:
                os.remove(disk_path)
            except OSError:
                pass
            raise

        conn = Database.get_connection()
        try:
            cvscan_id = CVScanModel.insert_with_conn(conn, {
                "citizen_id":         citizen_id,
                "image_url":          image_url,
                "identified_species": detection["identified_species"],
                "confidence_score":   detection["confidence_score"],
            })
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return {
            "cvscan_id":           cvscan_id,
            "image_url":           image_url,
            "identified_species":  detection["identified_species"],
            "confidence_score":    detection["confidence_score"],
            "detections":          detection["detections"],
            "species_breakdown":   detection["species_breakdown"],
        }

    # ── Read helpers used by routes ─────────────
    @staticmethod
    def list_history(citizen_id: str) -> list[dict]:
        rows = CVScanModel.list_by_citizen(citizen_id)
        for r in rows:
            if r.get("scanned_at") is not None:
                r["scanned_at"] = r["scanned_at"].isoformat()
            if r.get("confidence_score") is not None:
                r["confidence_score"] = float(r["confidence_score"])
        return rows