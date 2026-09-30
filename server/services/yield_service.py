# services/yield_service.py

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
from utils.dates import ph_today

NORMAL_LABEL = "Normal / Healthy"
VALID_INSPECT = {
    NORMAL_LABEL,
    "Presence of Queen Cells",
    "Reduction of Open Brood",
    "Emaciated Queen",
}

HARVEST_REMARKS_PREFIX = "Harvest Inspection: "


def _has_symptom_logged_today(hive_id: str, yield_date) -> bool:
    """
    True if ANY "Harvest Inspection" entry already logged for this
    hive on this exact date reported a real symptom (not "Normal /
    Healthy"). Combined (OR'd) with whatever THIS submission itself
    reports in add_harvest() below — so multiple same-day Add Yield
    submissions merge into one combined symptom picture for that day,
    instead of the latest submission's own checkboxes alone silently
    overriding an earlier one from the same day (e.g. a big 150kg
    healthy harvest logged in the morning, topped up with a smaller
    15kg entry later that flags a symptom — the day is treated as
    "has a symptom" either way, rather than the topped-up entry
    quietly erasing the earlier clean one or vice versa).
    """
    sql = """
        SELECT remarks FROM hives_maintenance
        WHERE hive_id = %s AND activity_type = 'Inspection' AND activity_date = %s
          AND remarks LIKE %s
    """
    rows = Database.execute(
        sql, (hive_id, yield_date, f"{HARVEST_REMARKS_PREFIX}%"), fetchall=True
    ) or []
    for row in rows:
        remarks = row.get("remarks") or ""
        if not remarks.startswith(HARVEST_REMARKS_PREFIX):
            continue
        labels = [
            p.strip()
            for p in remarks[len(HARVEST_REMARKS_PREFIX):].split(",")
            if p.strip()
        ]
        if any(label != NORMAL_LABEL for label in labels):
            return True
    return False


def _as_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    return v


def recompute_health_after_delete(beekeeper_id: str, hive_id: str) -> str:
    """
    NEW — works out the hive's health again after a harvest or a
    monitoring record was DELETED, so the deleted entry no longer counts:
      - The hive still has harvests -> same rule as Add Yield, using the
        most recent remaining harvest (its date + that day's symptoms)
        and the year's new, smaller total.
      - No harvests left -> from the Monitor Hive Health symptoms that
        are still unresolved (same rule as Monitor Hive Health).
    Then re-runs the queen check (which may also switch a Healthy hive
    with a 2+ year old queen to Needs Attention). Returns the new health.
    """
    from services.hive_service import _health_from_observations  # avoid import cycle

    hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
    if not hive:
        raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

    latest = YieldModel.latest_non_baseline(hive_id)
    if latest:
        latest_date = _as_date(latest["yield_date"])
        new_health, _details = compute_health_status(
            hive, latest_date, hive.get("health_status"),
            _has_symptom_logged_today(hive_id, latest_date),
        )
    else:
        new_health = _health_from_observations(
            HiveMaintenanceModel.list_unresolved_symptoms(hive_id)
        )

    if new_health != hive.get("health_status"):
        HiveModel.update_health_status(hive_id, beekeeper_id, new_health)

    result = QueenService.evaluate_hive(hive_id, persist=True)
    return result.get("health_status") or new_health


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

        yield_date = yield_date or ph_today()
        if yield_kg is None or float(yield_kg) < 0:
            raise ValueError("yield_kg must be a non-negative number.")

        if not observation_labels or not set(observation_labels).issubset(VALID_INSPECT):
            raise ValueError(
                f"Unknown physical-inspection observation(s): {observation_labels!r}. "
                f"Expected a non-empty subset of {sorted(VALID_INSPECT)}."
            )
        if NORMAL_LABEL in observation_labels and len(observation_labels) > 1:
            raise ValueError(f"{NORMAL_LABEL!r} cannot be combined with other symptoms.")

        # Merge with any symptom already logged earlier TODAY for this
        # hive (see _has_symptom_logged_today's docstring) — a symptom
        # reported in EITHER this submission or an earlier one from
        # the same day marks the whole day as "has a symptom" for
        # health-status purposes.
        this_entry_has_symptom = NORMAL_LABEL not in observation_labels
        has_symptom = this_entry_has_symptom or _has_symptom_logged_today(
            hive_id, yield_date
        )

        conn = Database.get_connection()
        try:
            # SAME-DAY HARVESTS ARE ADDED TOGETHER (NEW): a second entry
            # for the same hive on the same date (e.g. 150 kg in the
            # morning, then 15 kg more) is added to that day's harvest
            # (-> 165 kg) instead of being saved as a separate, smaller
            # harvest — which looked like a big drop in yield.
            existing = YieldModel.find_same_day_harvest(hive_id, yield_date, conn=conn)
            if existing:
                yid = existing["yield_id"]
                YieldModel.add_kg_with_conn(conn, yid, float(yield_kg))
                day_total_kg = round(float(existing["yield_kg"]) + float(yield_kg), 2)
                merged = True
            else:
                yid = YieldModel.insert_with_conn(conn, {
                    "hive_id":     hive_id,
                    "yield_date":  yield_date,
                    "yield_kg":    float(yield_kg),
                    "is_baseline": False,
                })
                day_total_kg = round(float(yield_kg), 2)
                merged = False

            HiveMaintenanceModel.record_physical_inspection(
                conn, hive_id, observation_labels, yield_date,
                remarks_prefix="Harvest Inspection",
            )

            # `conn`: count THIS harvest in the year total (it isn't
            # committed yet — see harvest_health.total_harvest_for_year).
            new_health, details = compute_health_status(
                hive, yield_date, hive.get("health_status"), has_symptom,
                conn=conn,
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
            # The day's total after this entry (same as added_kg unless
            # it was added to an earlier harvest from the same day).
            "yield_kg":       day_total_kg,
            "added_kg":       float(yield_kg),
            "merged_same_day": merged,
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

    # ── Delete a harvest (Transaction History -> Harvest) ──
    @staticmethod
    def delete_harvest(beekeeper_id: str, hive_id: str, yield_id: str) -> dict:
        """
        NEW — removes one harvest. Its kg is taken off every total
        (Yield This Month, dashboard, charts) because those are always
        added up from the saved harvests. The "Harvest Inspection" check
        saved with it on the same date is removed too. Health is then
        worked out again without it (recompute_health_after_delete).
        The historical baseline can't be deleted here.
        """
        hive = HiveModel.find_by_id_and_beekeeper(hive_id, beekeeper_id)
        if not hive:
            raise PermissionError("Hive does not exist or is not owned by this beekeeper.")

        row = YieldModel.find_by_id_for_hive(yield_id, hive_id)
        if not row:
            raise LookupError("Harvest not found.")
        if row.get("is_baseline"):
            raise ValueError("The historical baseline can't be deleted here.")

        conn = Database.get_connection()
        try:
            YieldModel.delete_with_conn(conn, yield_id, hive_id)
            HiveMaintenanceModel.delete_harvest_inspections_with_conn(
                conn, hive_id, row["yield_date"]
            )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        new_health = recompute_health_after_delete(beekeeper_id, hive_id)
        return {
            "yield_id":      yield_id,
            "hive_id":       hive_id,
            "deleted_kg":    float(row["yield_kg"]),
            "health_status": new_health,
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