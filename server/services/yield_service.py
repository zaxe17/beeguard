"""
Yield (harvest) recording service.

Every non-baseline harvest write triggers the Queen recommendation
engine INSIDE the same transaction — the yield row and the
recommendation row commit together, so the dashboard never sees a
harvest without its updated recommendation (or vice-versa).

Historical baselines are IMMUTABLE from this service — the only way
to set a baseline is at hive creation time (HiveService.create_hive)
or via the explicit `set_baseline` path below. That preserves the
"Never overwrite previous harvests" rule.
"""
import datetime as dt

from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from services.queen_service import QueenService


class YieldService:

    # ── Add a real (non-baseline) harvest ───────
    @staticmethod
    def add_harvest(beekeeper_id: str, hive_id: str,
                    yield_kg: float, yield_date: dt.date | None = None) -> dict:
        hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

        yield_date = yield_date or dt.date.today()
        if yield_kg is None or float(yield_kg) < 0:
            raise ValueError("yield_kg must be a non-negative number.")

        conn = Database.get_connection()
        try:
            yid = YieldModel.insert_with_conn(conn, {
                "hive_id":     hive_id,
                "yield_date":  yield_date,
                "yield_kg":    float(yield_kg),
                "is_baseline": False,
            })
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
            # zero-yield-row cases (kept in sync so _baseline_kg's
            # fallback never diverges from the canonical row).
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