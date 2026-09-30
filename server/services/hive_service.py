# hive_service.py

"""
Hive lifecycle orchestration.

Key responsibilities:
  * Create hive + optionally seed a HISTORICAL baseline yield row
    in one atomic transaction.
  * Record Physical Inspection observations from the MonitorHealth
    modal — writes to hives_maintenance (option a) AND updates
    hives.health_status, then re-runs the queen rules engine.
  * Enforce beekeeper ownership on every mutating call.

CUMULATIVE HEALTH TRACKING
---------------------------
health_status is no longer derived from a single Physical Inspection
submission in isolation. Instead, each new inspection is MERGED with
any symptoms still "open" from prior monitoring sessions (i.e. every
distinct symptom reported since the last time the beekeeper recorded
'Normal / Healthy'). This means:

  - Monitor #1: select "Presence of Queen Cells"        -> Needs Attention
  - Monitor #2: select "Emaciated Queen" (different one) -> Weak
    (because the hive now has 2 distinct unresolved symptoms:
     Queen Cells from monitor #1 + Emaciated Queen from monitor #2)
  - Monitor #3: select "Normal / Healthy"                -> Healthy
    (resets the tracker — future inspections start counting fresh)

Re-selecting the SAME symptom again does not double-count it (the
merge is a set union), so re-confirming an existing symptom does not
by itself push the hive from Needs Attention to Weak.
"""
import datetime as dt
from decimal import Decimal

from config.config import Config
from config.database import Database
from models.hive import HiveModel
from models.queen_recommendation import QueenRecommendationModel
from models.yield_record import YieldModel
from models.hive_maintenance import HiveMaintenanceModel
from services.queen_service import (
    QueenService,
    QUEEN_TOO_OLD_HEALTH,
    R_QUEEN_TOO_OLD,
    _queen_age_days,
)


# The four checkboxes in the MonitorHealth modal.
NORMAL_LABEL = "Normal / Healthy"
VALID_INSPECTION_LABELS = {
    NORMAL_LABEL,
    "Presence of Queen Cells",
    "Reduction of Open Brood",
    "Emaciated Queen",
}


def _health_from_observations(observation_labels: list[str]) -> str:
    """
    Maps a set of Physical Inspection labels to a health_status.

    IMPORTANT: as of the cumulative-tracking change, `observation_labels`
    passed in here is expected to already be the MERGED/CUMULATIVE set
    (this session's picks + any still-unresolved symptoms from prior
    monitoring sessions) — not just what was checked in the current
    submission. See HiveService.record_physical_inspection().

      - Only "Normal / Healthy" present (0 real symptoms) -> "Healthy"
      - Exactly 1 distinct symptom                        -> "Needs Attention"
      - 2 or 3 distinct symptoms                           -> "Weak"

    "Normal / Healthy" is mutually exclusive with the other three at
    the validator level (validate_physical_inspection rejects mixing
    them within a single submission), so if it's present here it will
    be the only item — the symptom_count below naturally comes out to
    0 in that case.
    """
    symptom_count = len([o for o in observation_labels if o != NORMAL_LABEL])
    if symptom_count == 0:
        return "Healthy"
    elif symptom_count == 1:
        return "Needs Attention"
    else:  # 2 or 3
        return "Weak"


def _with_coords(hive: dict | None) -> dict | None:
    """
    NEW — latitude / longitude come out of MySQL as Decimal, which the
    JSON response turns into a string ("14.4911000"). Send plain numbers
    so the map can use them directly.
    """
    if not hive:
        return hive
    for k in ("latitude", "longitude"):
        if isinstance(hive.get(k), Decimal):
            hive[k] = float(hive[k])
    return hive


class HiveService:

    # ── CREATE ────────────────────────────────
    @staticmethod
    def create_hive(beekeeper_id: str, payload: dict) -> dict:
        """
        payload:
          hive_name, bee_species, date_established (YYYY-MM-DD),
          queen_installed_date (YYYY-MM-DD, optional — defaults to date_established),
          health_status (default 'Healthy'),
          hive_state    (default 'Active'),
          # optional historical baseline — used for "old hive with prior harvests"
          historical_yield_kg   (float, optional),
          historical_yield_year (int, optional, e.g. 2025),
          # NEW — optional location + map pin
          location (str), latitude / longitude (float),
        """
        conn = Database.get_connection()
        try:
            record = {
                "beekeeper_id":          beekeeper_id,
                "hive_name":             payload["hive_name"],
                "bee_species":           payload["bee_species"],
                "location":              payload.get("location"),
                "latitude":              payload.get("latitude"),
                "longitude":             payload.get("longitude"),
                "date_established":      payload["date_established"],
                "queen_installed_date":  payload.get("queen_installed_date")
                                          or payload["date_established"],
                "historical_yield_kg":   payload.get("historical_yield_kg"),
                "historical_yield_year": payload.get("historical_yield_year"),
                "health_status":         payload.get("health_status", "Healthy"),
                "hive_state":            payload.get("hive_state", "Active"),
            }
            hive_id = HiveModel.insert_with_conn(conn, record)

            # Seed baseline yield row when the beekeeper supplied
            # a historical harvest at hive creation time.
            hist_kg   = payload.get("historical_yield_kg")
            hist_year = payload.get("historical_yield_year")
            if hist_kg is not None and hist_year is not None:
                # Anchor the baseline row to Dec 31 of that year so it
                # sorts BEFORE any future non-baseline harvests.
                baseline_date = dt.date(int(hist_year), 12, 31)
                YieldModel.insert_with_conn(conn, {
                    "hive_id":     hive_id,
                    "yield_date":  baseline_date,
                    "yield_kg":    hist_kg,
                    "is_baseline": True,
                })

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        # Evaluate once so the dashboard has a recommendation row from t=0
        QueenService.evaluate_hive(hive_id, persist=True)

        created = HiveModel.find_by_id(hive_id)
        return _with_coords(created)

    # ── LIST / GET ────────────────────────────
    @staticmethod
    def list_hives(beekeeper_id: str, state: str | None = None):
        hives = [_with_coords(h) for h in HiveModel.list_by_beekeeper(beekeeper_id, state=state)]
        return HiveService._attach_queen_status(beekeeper_id, hives)

    @staticmethod
    def _attach_queen_status(beekeeper_id: str, hives: list[dict]) -> list[dict]:
        """
        NEW — adds to every hive:
          queen_age_days         days since the queen was installed
          queen_recommendation   the open Replace/Monitor recommendation
                                 ({level, reason, reason_code}) or None

        So the Hives page can show the "Replace Queen" warning + button
        for ANY open recommendation — including an old queen on a
        Healthy hive (before, the page only looked at health_status, so
        a Healthy hive with a 2-year-old queen never showed it even
        though the recommendation existed).

        Also catches queens that got too old with nothing else
        happening: the queen-age rule only ran when a harvest/check was
        saved, so a queen that crossed the age limit on a quiet day had
        no recommendation. If a queen is past the limit and has no
        "queen too old" recommendation yet, the hive is re-evaluated
        once here to create it.
        """
        if not hives:
            return hives

        latest: dict[str, dict] = {}
        for r in QueenRecommendationModel.list_open_for_beekeeper(beekeeper_id):
            latest.setdefault(r["hive_id"], r)  # newest first

        for h in hives:
            age = _queen_age_days(h)
            rec = latest.get(h["hive_id"])
            too_old = age is not None and age >= Config.QUEEN_MAX_AGE_DAYS
            # NEW — also re-check a Healthy hive with a too-old queen, so
            # it's switched to "Needs Attention" (QueenService R1).
            if too_old and (
                not rec
                or rec.get("reason_code") != R_QUEEN_TOO_OLD
                or h.get("health_status") == "Healthy"
            ):
                try:
                    rec = QueenService.evaluate_hive(h["hive_id"], persist=True)
                    if h.get("health_status") == "Healthy":
                        h["health_status"] = QUEEN_TOO_OLD_HEALTH
                except Exception as e:
                    print(f"[HIVES] Queen re-check failed for {h['hive_id']}: {e}")

            h["queen_age_days"] = age
            h["queen_recommendation"] = (
                {
                    "level": rec["level"],
                    "reason": rec["reason"],
                    "reason_code": rec["reason_code"],
                }
                if rec and rec.get("level") in ("Monitor", "Replace")
                else None
            )
        return hives

    # ── EDIT (Hive Details -> Edit) ───────────
    @staticmethod
    def update_hive(beekeeper_id: str, hive_id: str, cleaned: dict) -> dict:
        """
        NEW — saves the Edit Hive form (name, species, dates, state,
        location + map pin).
        Re-checks the queen afterwards: changing the queen's date can make
        her "too old" (-> Replace Queen + Needs Attention) or not anymore.
        """
        hive = HiveService.get_hive_owned(beekeeper_id, hive_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

        HiveModel.update_details(hive_id, beekeeper_id, cleaned)

        if "queen_installed_date" in cleaned or "date_established" in cleaned:
            try:
                QueenService.evaluate_hive(hive_id, persist=True)
            except Exception as e:
                print(f"[HIVE-EDIT] Queen re-check failed for {hive_id}: {e}")

        updated = HiveService.get_hive_owned(beekeeper_id, hive_id)
        return HiveService._attach_queen_status(beekeeper_id, [updated])[0]

    @staticmethod
    def get_hive_owned(beekeeper_id: str, hive_id: str) -> dict | None:
        return _with_coords(HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id))

    # ── MAINTENANCE HISTORY (ViewHistory modal, Monitoring tab) ─
    @staticmethod
    def list_maintenance(beekeeper_id: str, hive_id: str, limit: int | None = None):
        hive = HiveService.get_hive_owned(beekeeper_id, hive_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")
        rows = HiveMaintenanceModel.list_by_hive(hive_id, limit=limit)
        # Normalise dates for JSON
        for r in rows:
            if isinstance(r.get("activity_date"), (dt.date, dt.datetime)):
                r["activity_date"] = r["activity_date"].isoformat()
            if isinstance(r.get("created_at"), (dt.date, dt.datetime)):
                r["created_at"] = r["created_at"].isoformat()
        return rows

    # ── DELETE a monitoring record (Transaction History -> Monitoring) ─
    @staticmethod
    def delete_maintenance(beekeeper_id: str, hive_id: str, maintenance_id: str) -> dict:
        """
        NEW — removes one monitoring record. The hive's health then goes
        back to what the PREVIOUS record (the one before it, now the
        latest) said — see _health_from_latest_record().
        """

        hive = HiveService.get_hive_owned(beekeeper_id, hive_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")
        row = HiveMaintenanceModel.find_for_hive(maintenance_id, hive_id)
        if not row:
            raise LookupError("Monitoring record not found.")

        conn = Database.get_connection()
        try:
            HiveMaintenanceModel.delete_with_conn(conn, maintenance_id, hive_id)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        new_health = HiveService._health_from_latest_record(beekeeper_id, hive_id)
        return {
            "maintenance_id": maintenance_id,
            "hive_id":        hive_id,
            "health_status":  new_health,
        }

    @staticmethod
    def _health_from_latest_record(beekeeper_id: str, hive_id: str) -> str:
        """
        After a monitoring record is deleted: the hive's health = what the
        record now on top of the Monitoring list (the previous one) says.
          - Monitor Hive Health check ("Physical Inspection") -> same rule
            as Monitor Hive Health, with the symptoms still open as of
            that check (1 symptom = Needs Attention, 2-3 = Weak,
            Normal / Healthy = Healthy).
          - Add Yield check ("Harvest Inspection") -> same rule as Add
            Yield for that harvest date.
          - No records left -> Healthy.
        Then the queen check runs (a queen 2+ years old still makes a
        Healthy hive Needs Attention). Returns the resulting health.
        """
        # Local imports: yield_service imports this module's helpers.
        from services.harvest_health import compute_health_status
        from services.yield_service import _has_symptom_logged_today

        hive = HiveService.get_hive_owned(beekeeper_id, hive_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

        latest = HiveMaintenanceModel.latest_inspection(hive_id)
        remarks = (latest or {}).get("remarks") or ""

        if not latest:
            new_health = "Healthy"
        elif remarks.startswith("Harvest Inspection"):
            day = latest["activity_date"]
            if isinstance(day, dt.datetime):
                day = day.date()
            new_health, _ = compute_health_status(
                hive, day, hive.get("health_status"),
                _has_symptom_logged_today(hive_id, day),
            )
        else:
            # Physical Inspection (or the reset row after Replace Queen):
            # the symptoms still open as of this check.
            new_health = _health_from_observations(
                HiveMaintenanceModel.list_unresolved_symptoms(hive_id)
            )

        if new_health != hive.get("health_status"):
            HiveModel.update_health_status(hive_id, beekeeper_id, new_health)

        result = QueenService.evaluate_hive(hive_id, persist=True)
        return result.get("health_status") or new_health

    # ── PHYSICAL INSPECTION (MonitorHealth modal) ─
    @staticmethod
    def record_physical_inspection(beekeeper_id: str, hive_id: str,
                                    observation_labels: list[str],
                                    activity_date: dt.date | None = None) -> dict:
        """
        Called by the MonitorHealth modal. `activity_date` is REQUIRED —
        the beekeeper must explicitly pick the date of the inspection;
        there is no silent "defaults to today" fallback.

        Encapsulates the whole flow:
          1. Ownership check
          2. Look up any symptoms still unresolved from PRIOR monitoring
             sessions (everything reported since the last 'Normal /
             Healthy' record), and merge them with this session's picks
             into a cumulative set.
          3. Write ONE hives_maintenance row (activity_type='Inspection',
             remarks='Physical Inspection: <label1>, <label2>, ...')
             — remarks reflect ONLY this session's picks (audit trail).
          4. Update hives.health_status from the CUMULATIVE merged set
             (see _health_from_observations).
          5. Re-run queen rules engine (may fire a recommendation).
        """
        if not observation_labels or not set(observation_labels).issubset(VALID_INSPECTION_LABELS):
            raise ValueError(
                f"Unknown physical-inspection observation(s): {observation_labels!r}. "
                f"Expected a non-empty subset of {sorted(VALID_INSPECTION_LABELS)}."
            )
        if NORMAL_LABEL in observation_labels and len(observation_labels) > 1:
            raise ValueError(
                f"{NORMAL_LABEL!r} cannot be combined with other symptoms."
            )

        if activity_date is None:
            raise ValueError("activity_date is required.")

        hive = HiveService.get_hive_owned(beekeeper_id, hive_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

        # ── Merge with unresolved symptoms from prior sessions ──
        # Selecting 'Normal / Healthy' now is an explicit "hive is
        # clear" signal, so it overrides/resets any carried-over
        # symptoms rather than being merged with them.
        if NORMAL_LABEL in observation_labels:
            cumulative_labels = list(observation_labels)
        else:
            prior_symptoms = HiveMaintenanceModel.list_unresolved_symptoms(hive_id)
            cumulative_labels = list(prior_symptoms)
            for label in observation_labels:
                if label not in cumulative_labels:
                    cumulative_labels.append(label)

        new_health = _health_from_observations(cumulative_labels)

        conn = Database.get_connection()
        try:
            HiveMaintenanceModel.record_physical_inspection(
                conn, hive_id, observation_labels, activity_date,
            )
            # Same transaction — but update_health_status uses a fresh
            # connection under the hood, so commit maintenance first.
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        HiveModel.update_health_status(hive_id, beekeeper_id, new_health)

        # Re-evaluate — R3 may now apply (Needs Attention + declining yield)
        recommendation = QueenService.evaluate_hive(hive_id, persist=True)

        return {
            "hive_id":                hive_id,
            "observations":           observation_labels,   # what was checked THIS session
            "cumulative_observations": cumulative_labels,    # merged w/ prior unresolved symptoms
            "health_status":          new_health,
            "recommendation":         recommendation,
        }