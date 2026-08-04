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

from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from models.hive_maintenance import HiveMaintenanceModel
from services.queen_service import QueenService


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
        """
        conn = Database.get_connection()
        try:
            record = {
                "beekeeper_id":          beekeeper_id,
                "hive_name":             payload["hive_name"],
                "bee_species":           payload["bee_species"],
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
        return created

    # ── LIST / GET ────────────────────────────
    @staticmethod
    def list_hives(beekeeper_id: str, state: str | None = None):
        return HiveModel.list_by_beekeeper(beekeeper_id, state=state)

    @staticmethod
    def get_hive_owned(beekeeper_id: str, hive_id: str) -> dict | None:
        return HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)

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