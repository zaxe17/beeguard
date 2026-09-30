# services/verification_service.py
#
# Beekeeper verification:
#   1. Beekeeper uploads a document (Profile -> Verify Your Account)
#      -> verification_status = 'Pending'
#   2. Admin reviews it -> 'Verified' or 'Rejected' (+ reason)
#   3. Beekeeper is notified; a rejected beekeeper can upload again.
#
# Documents are PRIVATE (IDs, permits) — they're saved outside any
# public folder and only served through an authenticated route to the
# beekeeper who owns it or an admin (routes/verification.py).

import datetime as dt
import io
import os
import uuid

from config.database import Database
from services.notification_service import NotificationService, TYPE_ADMIN_VERIFY_REQUEST

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERIFICATION_UPLOAD_FOLDER = os.path.join(BACKEND_ROOT, "uploads", "verification")

# Shown in the "Type of Document" dropdown (the frontend loads this list
# from GET /api/verification/document-types). Saved in
# beekeepers.verification_document_type — VARCHAR(60) since Migration 020,
# so keep every label within 60 characters.
DOCUMENT_TYPES = [
    # Beekeeping-specific permits / certifications
    "Certificate of Wildlife Registration (CWR)",
    "Special Local Transport Permit (SLTP)",
    "BAI Apiary Registration",
    "Beekeeping NC II Certification",
    # General documents
    "Business Permit",
    "DTI Registration",
    "Barangay Clearance",
    "Valid Government ID",
]
assert all(len(t) <= 60 for t in DOCUMENT_TYPES), "Document type label too long"

# NEW — "Other": the beekeeper can also type a document that isn't in the
# list above (e.g. "LGU Certification"). Saved as typed, same column.
DOCUMENT_TYPE_MIN_LEN = 3
DOCUMENT_TYPE_MAX_LEN = 60


def _clean_document_type(value) -> str:
    """A listed type (any upper/lower case -> standard spelling), or a
    typed "Other" document name. Raises ValueError if it's not usable."""
    text = " ".join(str(value or "").split())
    if not text:
        raise ValueError("Please choose or type the type of document.")
    listed = next((t for t in DOCUMENT_TYPES if t.lower() == text.lower()), None)
    if listed:
        return listed
    if text.lower() == "other":
        raise ValueError("Please type the name of your document.")
    if len(text) < DOCUMENT_TYPE_MIN_LEN:
        raise ValueError(
            f"Document name must be at least {DOCUMENT_TYPE_MIN_LEN} characters."
        )
    if len(text) > DOCUMENT_TYPE_MAX_LEN:
        raise ValueError(
            f"Document name must be {DOCUMENT_TYPE_MAX_LEN} characters or fewer."
        )
    return text

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "pdf"}
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024  # 10 MB
REJECTION_REASON_MAX_LEN = 255

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "pdf": "application/pdf",
}


def _iso(v):
    return v.isoformat() if isinstance(v, (dt.date, dt.datetime)) else v


def _ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""


def _looks_valid(data: bytes, ext: str) -> bool:
    """Checks the file really is what its extension says."""
    if ext == "pdf":
        return data[:5] == b"%PDF-"
    try:
        from PIL import Image
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
        return True
    except Exception:
        return False


def _beekeeper_row(beekeeper_id: str) -> dict | None:
    return Database.execute(
        """
        SELECT beekeeperID, name, farm_name, email, contact_no, address,
               apiary_type, status, verification_status,
               verification_document_type, verification_document_url,
               verification_submitted_at, verification_reviewed_at,
               verification_reviewed_by, verification_rejection_reason,
               created_at
        FROM beekeepers
        WHERE beekeeperID = %s AND deleted_at IS NULL
        LIMIT 1
        """,
        (beekeeper_id,),
        fetchone=True,
    )


def serialize_verification(row: dict) -> dict:
    return {
        "beekeeperID":       row["beekeeperID"],
        "name":              row.get("name"),
        "farm_name":         row.get("farm_name"),
        "email":             row.get("email"),
        "contact_no":        row.get("contact_no"),
        "address":           row.get("address"),
        "apiary_type":       row.get("apiary_type"),
        "status":            row.get("verification_status") or "Unverified",
        "document_type":     row.get("verification_document_type"),
        "has_document":      bool(row.get("verification_document_url")),
        "submitted_at":      _iso(row.get("verification_submitted_at")),
        "reviewed_at":       _iso(row.get("verification_reviewed_at")),
        "rejection_reason":  row.get("verification_rejection_reason"),
    }


class VerificationService:

    # ── BEEKEEPER ─────────────────────────────
    @staticmethod
    def get_mine(beekeeper_id: str) -> dict:
        row = _beekeeper_row(beekeeper_id)
        if not row:
            raise LookupError("Account not found.")
        return serialize_verification(row)

    @staticmethod
    def submit(beekeeper_id: str, document_type: str, file_storage) -> dict:
        row = _beekeeper_row(beekeeper_id)
        if not row:
            raise LookupError("Account not found.")
        if row.get("verification_status") == "Verified":
            raise ValueError("Your account is already verified.")

        # From the list, or typed under "Other".
        document_type = _clean_document_type(document_type)

        filename = file_storage.filename or ""
        ext = _ext(filename)
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError("Upload a JPG, PNG, WEBP or PDF file.")

        data = file_storage.read()
        if not data:
            raise ValueError("The file is empty.")
        if len(data) > MAX_DOCUMENT_BYTES:
            raise ValueError("The file must be 10 MB or smaller.")
        if not _looks_valid(data, ext):
            raise ValueError("That file couldn't be read. Please upload a clear photo or PDF.")

        os.makedirs(VERIFICATION_UPLOAD_FOLDER, exist_ok=True)
        stored_name = f"{beekeeper_id}_{uuid.uuid4().hex}.{ext}"
        with open(os.path.join(VERIFICATION_UPLOAD_FOLDER, stored_name), "wb") as f:
            f.write(data)

        old_file = row.get("verification_document_url")

        try:
            Database.execute(
                """
                UPDATE beekeepers
                SET verification_document_type    = %s,
                    verification_document_url     = %s,
                    verification_status           = 'Pending',
                    verification_submitted_at     = CURRENT_TIMESTAMP,
                    verification_reviewed_at      = NULL,
                    verification_reviewed_by      = NULL,
                    verification_rejection_reason = NULL
                WHERE beekeeperID = %s AND deleted_at IS NULL
                """,
                (document_type, stored_name, beekeeper_id),
                commit=True,
            )
        except Exception:
            try:
                os.remove(os.path.join(VERIFICATION_UPLOAD_FOLDER, stored_name))
            except OSError:
                pass
            raise

        # Replace, don't pile up: remove the previous document file.
        if old_file and old_file != stored_name:
            try:
                os.remove(os.path.join(VERIFICATION_UPLOAD_FOLDER, os.path.basename(old_file)))
            except OSError:
                pass

        # Admins: a beekeeper is waiting for review (bell + push). Best-effort.
        who = row.get("name") or "A beekeeper"
        farm = f" ({row['farm_name']})" if row.get("farm_name") else ""
        again = " again" if row.get("verification_status") == "Rejected" else ""
        NotificationService.notify_admins(
            title="Verification Request",
            message=f"{who}{farm} uploaded a {document_type}{again} for verification.",
            notification_type=TYPE_ADMIN_VERIFY_REQUEST,
        )

        return serialize_verification(_beekeeper_row(beekeeper_id))

    # ── DOCUMENT FILE (owner or admin) ────────
    @staticmethod
    def document_file(role: str, user_id: str, beekeeper_id: str) -> tuple[str, str]:
        """Returns (absolute path, mimetype). Raises PermissionError / LookupError."""
        if role != "admin" and not (role == "beekeeper" and user_id == beekeeper_id):
            raise PermissionError("You can't view this document.")
        row = _beekeeper_row(beekeeper_id)
        if not row or not row.get("verification_document_url"):
            raise LookupError("No document uploaded.")
        name = os.path.basename(row["verification_document_url"])
        path = os.path.join(VERIFICATION_UPLOAD_FOLDER, name)
        if not os.path.isfile(path):
            raise LookupError("The document file is missing. Ask the beekeeper to upload it again.")
        return path, MIME_TYPES.get(_ext(name), "application/octet-stream")

    # ── ADMIN ─────────────────────────────────
    @staticmethod
    def list_for_admin(status: str | None = "Pending") -> list[dict]:
        # Only real accounts (OTP entered) — see services/admin_service.py.
        where = "deleted_at IS NULL AND email_verified = TRUE"
        params: list = []
        if status and status.lower() != "all":
            where += " AND verification_status = %s"
            params.append(status)
        rows = Database.execute(
            f"""
            SELECT beekeeperID, name, farm_name, email, contact_no, address,
                   apiary_type, status, verification_status,
                   verification_document_type, verification_document_url,
                   verification_submitted_at, verification_reviewed_at,
                   verification_reviewed_by, verification_rejection_reason,
                   created_at
            FROM beekeepers
            WHERE {where}
            ORDER BY verification_submitted_at IS NULL, verification_submitted_at ASC
            LIMIT 200
            """,
            tuple(params),
            fetchall=True,
        ) or []
        return [serialize_verification(r) for r in rows]

    @staticmethod
    def approve(admin_id: str, beekeeper_id: str) -> dict:
        row = _beekeeper_row(beekeeper_id)
        if not row:
            raise LookupError("Beekeeper not found.")
        if not row.get("verification_document_url"):
            raise ValueError("This beekeeper hasn't uploaded a document yet.")

        Database.execute(
            """
            UPDATE beekeepers
            SET verification_status           = 'Verified',
                verification_reviewed_at      = CURRENT_TIMESTAMP,
                verification_reviewed_by      = %s,
                verification_rejection_reason = NULL
            WHERE beekeeperID = %s
            """,
            (admin_id, beekeeper_id),
            commit=True,
        )
        NotificationService.notify_many([
            NotificationService.verification_item(beekeeper_id=beekeeper_id, approved=True)
        ])
        return serialize_verification(_beekeeper_row(beekeeper_id))

    @staticmethod
    def reject(admin_id: str, beekeeper_id: str, reason: str) -> dict:
        reason = (reason or "").strip()
        if not reason:
            raise ValueError("Please give a reason so the beekeeper knows what to fix.")
        if len(reason) > REJECTION_REASON_MAX_LEN:
            raise ValueError(f"Reason must be {REJECTION_REASON_MAX_LEN} characters or fewer.")

        row = _beekeeper_row(beekeeper_id)
        if not row:
            raise LookupError("Beekeeper not found.")

        Database.execute(
            """
            UPDATE beekeepers
            SET verification_status           = 'Rejected',
                verification_reviewed_at      = CURRENT_TIMESTAMP,
                verification_reviewed_by      = %s,
                verification_rejection_reason = %s
            WHERE beekeeperID = %s
            """,
            (admin_id, reason, beekeeper_id),
            commit=True,
        )
        NotificationService.notify_many([
            NotificationService.verification_item(
                beekeeper_id=beekeeper_id, approved=False, reason=reason,
            )
        ])
        return serialize_verification(_beekeeper_row(beekeeper_id))