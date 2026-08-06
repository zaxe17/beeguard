# queen_service.py

"""
Queen Bee Replacement Recommendation Engine — Feature 3.
(docstring unchanged — see original for full rules R1-R6)
"""
import datetime as dt

from config.config import Config
from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from models.queen_recommendation import QueenRecommendationModel


R_QUEEN_TOO_OLD        = "QUEEN_AGE_EXCEEDED"
R_YIELD_BELOW_60       = "YIELD_BELOW_60_PCT"
R_DECLINING_AFTER_WARN = "DECLINING_AFTER_ATTENTION"
R_YIELD_BELOW_80       = "YIELD_BELOW_80_PCT"
R_HEALTH_DISEASED      = "HEALTH_STATUS_DISEASED"
R_HEALTH_FLAGGED       = "HEALTH_STATUS_FLAGGED"
R_NORMAL               = "NORMAL"

HEALTH_STATUSES_PROTECTED_FROM_YIELD_CHANGE = {"Diseased", "Weak"}
YIELD_RECOVERY_THRESHOLD_PCT = 100.0


def _queen_age_days(hive: dict, today: dt.date | None = None) -> int | None:
    today = today or dt.date.today()
    installed = hive.get("queen_installed_date") or hive.get("date_established")
    if not installed:
        return None
    if isinstance(installed, dt.datetime):
        installed = installed.date()
    return (today - installed).days


def _baseline_kg(hive: dict, conn=None) -> float | None:
    row = YieldModel.find_baseline(hive["hive_id"], conn=conn)
    if row and row.get("yield_kg") is not None:
        return float(row["yield_kg"])
    hy = hive.get("historical_yield_kg")
    return float(hy) if hy is not None else None


def _pct(current: float, baseline: float) -> float:
    if not baseline or baseline <= 0:
        return 0.0
    return round((current / baseline) * 100.0, 2)


def _as_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    return v


class QueenService:

    # ── Core evaluator ─────────────────────────
    @staticmethod
    def evaluate_hive(hive_id: str, *,
                       persist: bool = True,
                       conn=None,
                       skip_yield_health_downgrade: bool = False) -> dict:
        """
        `skip_yield_health_downgrade`: when True, the R_YIELD_BELOW_60
        branch below is still evaluated for level/reason/recommendation
        purposes, but it will NOT push hives.health_status down to
        "Needs Attention".

        Why this exists: right after QueenService.confirm_replacement()
        sets health_status to "Healthy", it calls this method again to
        refresh the recommendation. At that point the latest harvest on
        file is still the OLD, pre-replacement one (no new harvest has
        happened yet), so pct-vs-baseline is still low and would
        immediately flip health_status back to "Needs Attention" —
        undoing the reset in the same request, before the beekeeper
        even sees the "Healthy" result. confirm_replacement() passes
        skip_yield_health_downgrade=True to prevent that. Every other
        caller (dashboard refresh, batch evaluation, a fresh harvest
        coming in) leaves this False, so the normal downgrade rule
        still applies everywhere else.
        """
        hive = HiveModel.find_by_id(hive_id, conn=conn)
        if not hive:
            raise ValueError(f"Hive not found: {hive_id}")

        beekeeper_id = hive["beekeeper_id"]
        queen_age    = _queen_age_days(hive)
        baseline     = _baseline_kg(hive, conn=conn)

        latest       = YieldModel.latest_non_baseline(hive_id, conn=conn)
        current_kg   = float(latest["yield_kg"]) if latest else None
        pct          = _pct(current_kg, baseline) if (current_kg and baseline) else None

        current_health = hive.get("health_status")

        level, code, reason = "Normal", R_NORMAL, "Hive is performing within expected parameters."

        if queen_age is not None and queen_age >= Config.QUEEN_MAX_AGE_DAYS:
            level = "Replace"
            code  = R_QUEEN_TOO_OLD
            reason = (
                f"Queen age exceeded {Config.QUEEN_MAX_AGE_DAYS} days "
                f"(currently {queen_age} days)."
            )

        if level != "Replace" and pct is not None:
            if pct <= Config.YIELD_REPLACE_THRESHOLD_PCT:
                level = "Replace"
                code  = R_YIELD_BELOW_60
                reason = (
                    f"Latest harvest {current_kg:.2f} kg is "
                    f"{pct:.1f}% of the historical baseline "
                    f"{baseline:.2f} kg (threshold "
                    f"{Config.YIELD_REPLACE_THRESHOLD_PCT:.0f}%)."
                )
            elif pct <= 80.0:
                level = "Monitor"
                code  = R_YIELD_BELOW_80
                reason = (
                    f"Latest harvest {current_kg:.2f} kg is "
                    f"{pct:.1f}% of baseline {baseline:.2f} kg — trending down."
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
                level = "Monitor"
                code  = R_HEALTH_FLAGGED
                reason = f"Hive is currently marked '{current_health}' — monitor closely."

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
            if (
                code == R_YIELD_BELOW_60
                and not skip_yield_health_downgrade
                and current_health not in HEALTH_STATUSES_PROTECTED_FROM_YIELD_CHANGE
                and current_health != "Needs Attention"
            ):
                HiveModel.update_health_status(
                    hive_id, beekeeper_id, "Needs Attention", conn=conn
                )
            elif (
                pct is not None
                and pct >= YIELD_RECOVERY_THRESHOLD_PCT
                and current_health == "Needs Attention"
            ):
                HiveModel.update_health_status(
                    hive_id, beekeeper_id, "Healthy", conn=conn
                )

            latest_open = QueenRecommendationModel.latest_open_for_hive(hive_id, conn=conn)
            same = (
                latest_open
                and latest_open["level"]       == level
                and latest_open["reason_code"] == code
            )
            if not same:
                if latest_open and latest_open["level"] != "Normal":
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

        # skip_yield_health_downgrade=True: prevents the still-stale
        # (pre-replacement) yield numbers from flipping health_status
        # back down to "Needs Attention" the instant we just set it
        # to "Healthy" above. See evaluate_hive()'s docstring.
        return QueenService.evaluate_hive(
            hive_id, persist=True, skip_yield_health_downgrade=True
        )

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