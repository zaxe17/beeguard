# queen_service.py

"""
Queen Bee Replacement Recommendation Engine.

Health_status (Healthy / Needs Attention / Weak / Diseased) is now
decided by services.harvest_health at harvest-entry time (see
YieldService.add_harvest) or by the standalone Monitor Hive Health
flow (HiveService.record_physical_inspection). This service no longer
computes its own yield percentage — evaluate_hive() purely REACTS to
whatever health_status is already on the hive, plus two independent
signals that stay exactly as before:

  R1 — Queen age: regardless of health_status, once the queen has
       been installed for >= Config.QUEEN_MAX_AGE_DAYS, automatic
       Replace.
  R_DECLINING_AFTER_WARN — a hive already flagged "Needs Attention"
       whose latest harvest is LOWER than the one before it: automatic
       Replace (confirmed: this still applies even though the
       "Needs Attention" itself may now have come from the new
       harvest-health engine rather than the old pct rule).
  Otherwise: Diseased -> Replace, Weak/Needs Attention -> Replace,
       Healthy -> Normal.

yield_baseline_kg / yield_current_kg / yield_pct are still returned in
the result for display purposes (current year's cumulative vs its
resolved annual baseline — see services.harvest_health), but they no
longer drive `level`/`reason_code` here.
"""
import datetime as dt

from config.config import Config
from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from models.hive_maintenance import HiveMaintenanceModel
from models.queen_recommendation import QueenRecommendationModel
from services.harvest_health import (
    get_harvest_year,
    total_harvest_for_year,
    resolve_annual_baseline,
)


R_QUEEN_TOO_OLD        = "QUEEN_AGE_EXCEEDED"
R_DECLINING_AFTER_WARN = "DECLINING_AFTER_ATTENTION"
R_HEALTH_DISEASED      = "HEALTH_STATUS_DISEASED"
R_HEALTH_FLAGGED       = "HEALTH_STATUS_FLAGGED"
R_NORMAL               = "NORMAL"


def _queen_age_days(hive: dict, today: dt.date | None = None) -> int | None:
    today = today or dt.date.today()
    installed = hive.get("queen_installed_date") or hive.get("date_established")
    if not installed:
        return None
    if isinstance(installed, dt.datetime):
        installed = installed.date()
    return (today - installed).days


def _as_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    return v


class QueenService:

    # ── Core evaluator ─────────────────────────
    @staticmethod
    def evaluate_hive(hive_id: str, *,
                       persist: bool = True,
                       conn=None) -> dict:
        hive = HiveModel.find_by_id(hive_id, conn=conn)
        if not hive:
            raise ValueError(f"Hive not found: {hive_id}")

        beekeeper_id = hive["beekeeper_id"]
        queen_age    = _queen_age_days(hive)
        current_health = hive.get("health_status")

        # Informational only (display) — current year's cumulative vs
        # its resolved annual baseline. Does NOT drive level/reason
        # below; that's the harvest_health engine's job at entry time.
        year = get_harvest_year(dt.date.today())
        current_kg = total_harvest_for_year(hive_id, year) or None
        baseline = resolve_annual_baseline(hive, year)
        pct = round((current_kg / baseline) * 100.0, 2) if (current_kg and baseline) else None

        level, code, reason = "Normal", R_NORMAL, "Hive is performing within expected parameters."

        if queen_age is not None and queen_age >= Config.QUEEN_MAX_AGE_DAYS:
            level = "Replace"
            code  = R_QUEEN_TOO_OLD
            reason = (
                f"Queen age exceeded {Config.QUEEN_MAX_AGE_DAYS} days "
                f"(currently {queen_age} days)."
            )

        if level == "Normal" and current_health == "Needs Attention":
            last_two = YieldModel.last_n_non_baseline(hive_id, 2, conn=conn)
            if len(last_two) >= 2:
                latest_kg, prev_kg = float(last_two[0]["yield_kg"]), float(last_two[1]["yield_kg"])
                if latest_kg < prev_kg:
                    level = "Replace"
                    code  = R_DECLINING_AFTER_WARN
                    reason = (
                        f"Hive is flagged 'Needs Attention' and yield "
                        f"dropped from {prev_kg:.2f} kg to {latest_kg:.2f} kg."
                    )

        if level == "Normal":
            if current_health == "Diseased":
                level = "Replace"
                code  = R_HEALTH_DISEASED
                reason = "Hive is currently marked 'Diseased' — queen replacement recommended."
            elif current_health in ("Weak", "Needs Attention"):
                level = "Replace"
                code  = R_HEALTH_FLAGGED
                reason = f"Hive is currently marked '{current_health}' — queen replacement recommended."

        result = {
            "hive_id":            hive_id,
            "beekeeper_id":       beekeeper_id,
            "level":              level,
            "reason_code":        code,
            "reason":             reason,
            "yield_baseline_kg":  baseline,
            "yield_current_kg":   current_kg,
            "yield_pct":          pct,
            "queen_age_days":     queen_age,
        }

        if not persist:
            return result

        own_conn = conn is None
        if own_conn:
            conn = Database.get_connection()
        try:
            # NOTE: health_status is no longer mutated here — it's set
            # directly by YieldService.add_harvest (via harvest_health)
            # or HiveService.record_physical_inspection. This step only
            # manages the recommendation row.
            latest_open = QueenRecommendationModel.latest_open_for_hive(hive_id, conn=conn)
            same = (
                latest_open
                and latest_open["level"]       == level
                and latest_open["reason_code"] == code
            )
            if not same:
                # Resolve whatever was open before — including a
                # "Normal" row. Leaving Normal rows permanently
                # unresolved (the old behavior) meant a stale open
                # Normal row could sit there indefinitely; a LATER
                # Weak/Replace evaluation would then get resolved on
                # its own turn, but list_history_for_beekeeper() picks
                # "latest by evaluated_at" across ALL rows regardless
                # of resolved_at — so that now-resolved Replace row
                # (chronologically newer) kept outranking the
                # still-open, no-longer-current Normal row, showing
                # "Replace" in the History tab even after the hive had
                # genuinely gone back to Healthy.
                if latest_open:
                    QueenRecommendationModel.resolve_with_conn(
                        conn, latest_open["recommendation_id"]
                    )

                rid = QueenRecommendationModel.insert_with_conn(conn, result)
                result["recommendation_id"] = rid

                if level in ("Monitor", "Replace"):
                    from services.notification_service import NotificationService
                    NotificationService.notify_queen(
                        conn=conn,
                        beekeeper_id=beekeeper_id,
                        hive_id=hive_id,
                        level=level,
                        reason=reason,
                    )

            if own_conn:
                conn.commit()
        except Exception:
            if own_conn:
                conn.rollback()
            raise
        finally:
            if own_conn:
                conn.close()

        return result

    # ── Batch — used by dashboard & reports ────
    @staticmethod
    def evaluate_beekeeper(beekeeper_id: str, persist: bool = True) -> list[dict]:
        hives = HiveModel.list_by_beekeeper(beekeeper_id)
        return [QueenService.evaluate_hive(h["hive_id"], persist=persist) for h in hives]

    # ── Post-actions ───────────────────────────
    @staticmethod
    def confirm_replacement(hive_id: str, beekeeper_id: str,
                             installed_on: dt.date | None = None) -> dict:
        installed_on = installed_on or dt.date.today()
        conn = Database.get_connection()
        try:
            HiveModel.update_queen_installed(conn, hive_id, installed_on)
            HiveModel.update_health_status(hive_id, beekeeper_id, "Healthy", conn=conn)
            # Reset the cumulative symptom tracker used by the
            # STANDALONE Monitor Hive Health flow (see
            # HiveMaintenanceModel.record_reset's docstring).
            HiveMaintenanceModel.record_reset(conn, hive_id, installed_on)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        opens = QueenRecommendationModel.history_for_hive(hive_id, limit=5)
        for r in opens:
            if r["resolved_at"] is None and r["level"] in ("Monitor", "Replace"):
                QueenRecommendationModel.resolve(r["recommendation_id"], beekeeper_id)

        # No special-casing needed here anymore — evaluate_hive() no
        # longer derives health_status from yield data, so there's
        # nothing stale left to reopen a Replace/Monitor recommendation
        # the instant we just resolved it above.
        return QueenService.evaluate_hive(hive_id, persist=True)

    # ── NEW: Read-side for the History tab's queen-replacement grid ─
    @staticmethod
    def list_history_for_beekeeper(beekeeper_id: str) -> list[dict]:
        """
        One row per hive owned by this beekeeper:
          - hive_name
          - level: the most recent evaluation's level (Normal/Monitor/Replace)
          - reason: human-readable reason for that level
          - queen_installed_date: last time a queen was actually installed
          - replaced: True when the most recent Monitor/Replace
            recommendation has since been resolved AND the queen was
            installed on/after that recommendation was evaluated —
            i.e. confirm_replacement() ran to actually address it,
            as opposed to the recommendation just being superseded by
            a newer (still-open) one.

        Uses QueenRecommendationModel.history_for_hive(hive_id, limit=1)
        to get the single latest row per hive — same method already
        used by confirm_replacement() above, just capped to 1.
        """
        hives = HiveModel.list_by_beekeeper(beekeeper_id)
        rows = []
        for h in hives:
            latest_list = QueenRecommendationModel.history_for_hive(h["hive_id"], limit=1)
            latest = latest_list[0] if latest_list else None

            level = latest["level"] if latest else "Normal"
            reason = latest["reason"] if latest else "No evaluation yet."
            evaluated_at = latest.get("evaluated_at") if latest else None
            resolved_at = latest.get("resolved_at") if latest else None

            queen_installed = h.get("queen_installed_date")
            replaced = False
            if (
                latest
                and resolved_at
                and level in ("Monitor", "Replace")
                and queen_installed
                and evaluated_at
            ):
                replaced = _as_date(queen_installed) >= _as_date(evaluated_at)

            rows.append({
                "hive_id": h["hive_id"],
                "hive_name": h["hive_name"],
                "level": level,
                "reason": reason,
                "evaluated_at": evaluated_at.isoformat() if isinstance(evaluated_at, (dt.date, dt.datetime)) else evaluated_at,
                "resolved_at": resolved_at.isoformat() if isinstance(resolved_at, (dt.date, dt.datetime)) else resolved_at,
                "queen_installed_date": queen_installed.isoformat() if isinstance(queen_installed, (dt.date, dt.datetime)) else queen_installed,
                "replaced": replaced,
            })
        return rows