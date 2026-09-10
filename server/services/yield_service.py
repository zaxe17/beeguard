"""
Yield (harvest) recording service.

Every non-baseline harvest write now:
  1. Logs the accompanying physical-sign check (from the Add Yield
     form's own checkboxes) under a DEDICATED "Harvest Inspection: "
     remarks prefix — deliberately different from the standalone
     Monitor Hive Health modal's "Physical Inspection: " prefix, so
     HiveMaintenanceModel.list_unresolved_symptoms() (which powers
     Monitor Hive Health's OWN independent cumulative-symptom
     tracking) never picks these up. The two flows stay fully
     independent, as agreed.
  2. Computes the new health_status via services.harvest_health,
     using the year-to-date cumulative total against the rolling
     annual baseline (see that module's docstring for the full rule
     set).
  3. Re-runs the Queen recommendation engine.
All three steps happen INSIDE the same transaction as the yield
insert, so the dashboard never sees a harvest without its updated
health_status/recommendation (or vice-versa).

Historical baselines are IMMUTABLE from this service — the only way
to set a baseline is at hive creation time (HiveService.create_hive)
or via the explicit `set_baseline` path below. That preserves the
"Never overwrite previous harvests" rule.
"""
import datetime as dt

from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from models.hive_maintenance import HiveMaintenanceModel
from services.queen_service import QueenService
from services.harvest_health import compute_health_status

NORMAL_LABEL = "Normal / Healthy"
VALID_INSPECT = {
    NORMAL_LABEL,
    "Presence of Queen Cells",
    "Reduction of Open Brood",
    "Emaciated Queen",
}


class YieldService:

    # ── Add a real (non-baseline) harvest ───────
    @staticmethod
    def add_harvest(beekeeper_id: str, hive_id: str,
                    yield_kg: float, observation_labels: list[str],
                    yield_date: dt.date | None = None) -> dict:
        """
        `observation_labels`: the Add Yield form's own physical-sign
        checkboxes (same options as Monitor Hive Health — "Normal /
        Healthy" or one/more of the three symptoms). Required and
        non-empty — every harvest entry now carries its own sign
        check, per the combined-form design.
        """
        hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

        yield_date = yield_date or dt.date.today()
        if yield_kg is None or float(yield_kg) < 0:
            raise ValueError("yield_kg must be a non-negative number.")

        if not observation_labels or not set(observation_labels).issubset(VALID_INSPECT):
            raise ValueError(
                f"Unknown physical-inspection observation(s): {observation_labels!r}. "
                f"Expected a non-empty subset of {sorted(VALID_INSPECT)}."
            )
        if NORMAL_LABEL in observation_labels and len(observation_labels) > 1:
            raise ValueError(f"{NORMAL_LABEL!r} cannot be combined with other symptoms.")

        has_symptom = NORMAL_LABEL not in observation_labels

        conn = Database.get_connection()
        try:
            yid = YieldModel.insert_with_conn(conn, {
                "hive_id":     hive_id,
                "yield_date":  yield_date,
                "yield_kg":    float(yield_kg),
                "is_baseline": False,
            })

            HiveMaintenanceModel.record_physical_inspection(
                conn, hive_id, observation_labels, yield_date,
                remarks_prefix="Harvest Inspection",
            )

            new_health, details = compute_health_status(
                hive, yield_date, hive.get("health_status"), has_symptom,
            )
            if new_health != hive.get("health_status"):
                HiveModel.update_health_status(
                    hive_id, beekeeper_id, new_health, conn=conn
                )

            # Evaluate on the SAME transaction so the recommendation row
            # persists atomically with the harvest row.
            recommendation = QueenService.evaluate_hive(
                hive_id, persist=True, conn=conn
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return {
            "yield_id":       yid,
            "hive_id":        hive_id,
            "yield_date":     yield_date.isoformat(),
            "yield_kg":       float(yield_kg),
            "is_baseline":    False,
            "observations":   observation_labels,
            "health_status":  new_health,
            "health_details": details,
            "recommendation": recommendation,
        }

    # ── Set / replace historical baseline ───────
    @staticmethod
    def set_baseline(beekeeper_id: str, hive_id: str,
                     yield_kg: float, yield_year: int) -> dict:
        """
        Explicit baseline setter (e.g., beekeeper corrects a wrong
        historical figure entered at hive creation). Overwrites the
        previous baseline via YieldModel.insert_with_conn's
        single-baseline enforcement.
        """
        hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")
        if yield_kg is None or float(yield_kg) <= 0:
            raise ValueError("Baseline yield_kg must be a positive number.")

        baseline_date = dt.date(int(yield_year), 12, 31)

        conn = Database.get_connection()
        try:
            yid = YieldModel.insert_with_conn(conn, {
                "hive_id":     hive_id,
                "yield_date":  baseline_date,
                "yield_kg":    float(yield_kg),
                "is_baseline": True,
            })
            # Mirror the value into hives.historical_yield_* for
            # zero-yield-row cases (kept in sync so resolve_annual_
            # baseline's fallback never diverges from the canonical row).
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE hives SET historical_yield_kg = %s, "
                    "historical_yield_year = %s WHERE hive_id = %s",
                    (float(yield_kg), int(yield_year), hive_id),
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        # Re-evaluate since baseline changes swing pct calculations.
        recommendation = QueenService.evaluate_hive(hive_id, persist=True)

        return {
            "yield_id":       yid,
            "hive_id":        hive_id,
            "yield_date":     baseline_date.isoformat(),
            "yield_kg":       float(yield_kg),
            "is_baseline":    True,
            "recommendation": recommendation,
        }

    # ── Read helpers used by routes ─────────────
    @staticmethod
    def list_history(beekeeper_id: str, hive_id: str) -> list[dict]:
        hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")
        rows = YieldModel.list_by_hive(hive_id)
        # Normalise dates for JSON
        for r in rows:
            if isinstance(r.get("yield_date"), (dt.date, dt.datetime)):
                r["yield_date"] = r["yield_date"].isoformat()
            if isinstance(r.get("created_at"), (dt.date, dt.datetime)):
                r["created_at"] = r["created_at"].isoformat()
            if r.get("yield_kg") is not None:
                r["yield_kg"] = float(r["yield_kg"])
        return rows