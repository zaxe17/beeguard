"""
Hive lifecycle orchestration.

Key responsibilities:
  * Create hive + optionally seed a HISTORICAL baseline yield row
    in one atomic transaction.
  * Record Physical Inspection observations from the MonitorHealth
    modal — writes to hives_maintenance (option a) AND updates
    hives.health_status, then re-runs the queen rules engine.
  * Enforce beekeeper ownership on every mutating call.
"""
import datetime as dt

from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from models.hive_maintenance import HiveMaintenanceModel
from services.queen_service import QueenService


# Maps the 4 radio options in MonitorHealth modal → hives.health_status
INSPECTION_TO_HEALTH = {
    "Normal / Healthy":          "Healthy",
    "Presence of Queen Cells":   "Needs Attention",
    "Reduction of Open Brood":   "Needs Attention",
    "Emaciated Queen":           "Needs Attention",
}
VALID_INSPECTION_LABELS = set(INSPECTION_TO_HEALTH.keys())


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
                                    observation_label: str,
                                    activity_date: dt.date | None = None) -> dict:
        """
        Called by the MonitorHealth modal. Encapsulates the whole flow:
          1. Ownership check
          2. Write hives_maintenance row (activity_type='Inspection',
             remarks='Physical Inspection: <label>')
          3. Update hives.health_status from the observation
          4. Re-run queen rules engine (may fire a recommendation)
        """
        if observation_label not in VALID_INSPECTION_LABELS:
            raise ValueError(
                f"Unknown physical-inspection observation: {observation_label!r}. "
                f"Expected one of {sorted(VALID_INSPECTION_LABELS)}."
            )

        hive = HiveService.get_hive_owned(beekeeper_id, hive_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

        new_health = INSPECTION_TO_HEALTH[observation_label]
        activity_date = activity_date or dt.date.today()

        conn = Database.get_connection()
        try:
            HiveMaintenanceModel.record_physical_inspection(
                conn, hive_id, observation_label, activity_date,
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
            "hive_id":         hive_id,
            "observation":     observation_label,
            "health_status":   new_health,
            "recommendation":  recommendation,
        }