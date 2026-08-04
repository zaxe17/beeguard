# queen_service.py

"""
Queen Bee Replacement Recommendation Engine — Feature 3.

Evaluates a single hive against the business rules:

    (R1) Queen age >= QUEEN_MAX_AGE_DAYS (730)         -> Replace
    (R2) yield_pct <= 60% of historical baseline       -> Replace
                                                           + hive.health_status -> "Needs Attention"
    (R3) Health="Needs Attention" AND next harvest
         is lower than the previous one                 -> Replace
    (R4) yield_pct <= 80% but > 60%                    -> Monitor
    (R5) yield_pct >= 100% of baseline AND health_status
         is currently "Needs Attention"                 -> health_status back to "Healthy"
    (R6) still "Normal" after R1-R4, but the hive's
         CURRENT health_status is Diseased/Weak/Needs
         Attention (e.g. set manually at creation, or
         via a Physical Inspection, with no yield data
         yet to trigger R2-R4)                          -> Replace (Diseased)
                                                            or Monitor (Weak / Needs Attention)
    otherwise                                          -> Normal

The engine is CALLED from three triggers:
    (a) after a new (non-baseline) yield row is inserted
    (b) after a Physical Inspection is recorded that changes
        health_status to "Needs Attention"
    (c) once at hive creation, and on demand via
        /api/queen/evaluate/<hive_id>

Every evaluation is persisted to `queen_recommendations` so the
UI can render "Normal / Monitor / Replace" pills with a reason,
history is preserved (never overwritten), and notifications can
fan out from the same row.

Harvest-season gating: per confirmed decision, evaluation runs
MONTHLY (every month is a potential harvest). We therefore run
the engine unconditionally on new yield inserts; the "season"
gate collapses to a no-op.

IMPORTANT — transactional reads:
When `conn` is passed in (e.g. from YieldService.add_harvest, where
a new yield row was just inserted on that same connection but not
yet committed), every read this engine needs (hive row, baseline,
latest harvest, last-2 harvests) MUST go through that same `conn`.
Otherwise a fresh connection would not see the uncommitted insert
yet, and the engine would evaluate against stale (one-harvest-behind)
data — which is exactly the bug this file used to have.
"""
import datetime as dt

from config.config import Config
from config.database import Database
from models.hive import HiveModel
from models.yield_record import YieldModel
from models.queen_recommendation import QueenRecommendationModel


# ─── Reason codes (machine-stable) ─────────────
R_QUEEN_TOO_OLD        = "QUEEN_AGE_EXCEEDED"
R_YIELD_BELOW_60       = "YIELD_BELOW_60_PCT"
R_DECLINING_AFTER_WARN = "DECLINING_AFTER_ATTENTION"
R_YIELD_BELOW_80       = "YIELD_BELOW_80_PCT"
R_HEALTH_DISEASED      = "HEALTH_STATUS_DISEASED"
R_HEALTH_FLAGGED       = "HEALTH_STATUS_FLAGGED"
R_NORMAL               = "NORMAL"

# Health statuses that a yield-triggered CHANGE (down OR back up) must
# NEVER touch — "Diseased" and "Weak" are inspection/manual-confirmed
# states and shouldn't be silently flipped by yield numbers alone.
HEALTH_STATUSES_PROTECTED_FROM_YIELD_CHANGE = {"Diseased", "Weak"}

# Threshold (as a % of baseline) at/above which a recovered harvest
# clears a yield-caused "Needs Attention" back to "Healthy".
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
    """
    Baseline lookup priority:
      1. yields.is_baseline=TRUE row (canonical)
      2. hives.historical_yield_kg (seeded at hive creation)
    """
    row = YieldModel.find_baseline(hive["hive_id"], conn=conn)
    if row and row.get("yield_kg") is not None:
        return float(row["yield_kg"])
    hy = hive.get("historical_yield_kg")
    return float(hy) if hy is not None else None


def _pct(current: float, baseline: float) -> float:
    if not baseline or baseline <= 0:
        return 0.0
    return round((current / baseline) * 100.0, 2)


class QueenService:

    # ── Core evaluator ─────────────────────────
    @staticmethod
    def evaluate_hive(hive_id: str, *,
                       persist: bool = True,
                       conn=None) -> dict:
        """
        Runs all rules. Returns:
            {
              level, reason_code, reason,
              yield_baseline_kg, yield_current_kg, yield_pct,
              queen_age_days, hive_id, beekeeper_id,
              recommendation_id  (only when persist=True and a row was written)
            }

        When `conn` is passed, ALL reads AND the recommendation row
        INSERT (and any health-status change, if triggered) happen
        on that connection (same transaction as the yield write, for
        instance) — the caller must commit. When `conn` is None and
        persist=True, we open our own short-lived transaction for the
        whole evaluate-and-persist sequence.
        """
        # Read the hive row on `conn` when given, so we see any
        # not-yet-committed changes made earlier in this transaction.
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

        # ── Rule evaluation (order matters) ─────
        level, code, reason = "Normal", R_NORMAL, "Hive is performing within expected parameters."

        # R1: queen age ── always applies
        if queen_age is not None and queen_age >= Config.QUEEN_MAX_AGE_DAYS:
            level = "Replace"
            code  = R_QUEEN_TOO_OLD
            reason = (
                f"Queen age exceeded {Config.QUEEN_MAX_AGE_DAYS} days "
                f"(currently {queen_age} days)."
            )

        # R2/R4: yield vs baseline (only if we have both)
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

        # R3: declining harvest after 'Needs Attention'
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

        # R6: fallback — a hive that's manually/inspection-flagged as
        # Diseased, Weak, or Needs Attention should still surface as an
        # open recommendation even when no yield or queen-age rule
        # fired above (e.g. a brand-new hive added with
        # health_status="Diseased" at creation, before any harvest
        # exists to trigger R2/R3/R4).
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

        # ── Persist ───────────────────────────
        own_conn = conn is None
        if own_conn:
            conn = Database.get_connection()
        try:
            # Yield collapse (R2) downgrades hive.health_status —
            # done on the SAME conn/transaction as the recommendation
            # row below, so both commit or roll back together.
            if (
                code == R_YIELD_BELOW_60
                and current_health not in HEALTH_STATUSES_PROTECTED_FROM_YIELD_CHANGE
                and current_health != "Needs Attention"
            ):
                HiveModel.update_health_status(
                    hive_id, beekeeper_id, "Needs Attention", conn=conn
                )

            # R5: yield recovered to/above baseline — clear a
            # yield-caused "Needs Attention" back to "Healthy". Only
            # fires when the CURRENT status is "Needs Attention" (never
            # touches "Diseased"/"Weak" — those need inspection/manual
            # clearing, not just a good harvest).
            elif (
                pct is not None
                and pct >= YIELD_RECOVERY_THRESHOLD_PCT
                and current_health == "Needs Attention"
            ):
                HiveModel.update_health_status(
                    hive_id, beekeeper_id, "Healthy", conn=conn
                )

            # De-dupe: if the LATEST open recommendation for this hive is
            # identical in level+reason_code, don't spam another row.
            # MUST read on `conn` — see latest_open_for_hive docstring.
            latest_open = QueenRecommendationModel.latest_open_for_hive(hive_id, conn=conn)
            same = (
                latest_open
                and latest_open["level"]       == level
                and latest_open["reason_code"] == code
            )
            if not same:
                # Supersede: the hive's evaluation changed (e.g. Monitor
                # -> Replace, or Replace -> Monitor on a later harvest).
                # The OLD open recommendation is now stale, so close it
                # in the same transaction as the new insert below —
                # otherwise it stays "open" forever and one hive can
                # pile up multiple open rows, which is what was making
                # dashboard_summary()'s recommendations.open count
                # (list_open_for_beekeeper counts ROWS, not hives)
                # bigger than the number of hives actually needing
                # attention.
                if latest_open and latest_open["level"] != "Normal":
                    QueenRecommendationModel.resolve_with_conn(
                        conn, latest_open["recommendation_id"]
                    )

                rid = QueenRecommendationModel.insert_with_conn(conn, result)
                result["recommendation_id"] = rid

                # Fan out a notification for Monitor/Replace only.
                if level in ("Monitor", "Replace"):
                    from services.notification_service import NotificationService  # local import avoids cycle
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
        """
        Called from the "Queen Replaced" UI action. This is the
        confirmed, manual intervention the recommendation was asking
        for — so unlike the automatic yield-based transitions above,
        it ALWAYS clears the hive back to "Healthy" regardless of
        what it was before (Diseased, Weak, or Needs Attention all
        get reset here — a fresh queen is exactly the fix for all
        three). It also:
          - Updates the hive's queen_installed_date
          - Resolves any open Monitor/Replace recommendations
          - Forces a re-evaluation (which will now return Normal
            barring other issues, e.g. queen-age already exceeded
            again from a backdated installed_on)
        """
        installed_on = installed_on or dt.date.today()
        conn = Database.get_connection()
        try:
            HiveModel.update_queen_installed(conn, hive_id, installed_on)
            # NEW: a confirmed queen replacement is the actual fix for
            # Diseased / Weak / Needs Attention — reset health_status
            # to "Healthy" in the SAME transaction as the queen-date
            # update, so both commit or roll back together.
            HiveModel.update_health_status(hive_id, beekeeper_id, "Healthy", conn=conn)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        # Close any open Monitor/Replace recommendations for this hive
        opens = QueenRecommendationModel.history_for_hive(hive_id, limit=5)
        for r in opens:
            if r["resolved_at"] is None and r["level"] in ("Monitor", "Replace"):
                QueenRecommendationModel.resolve(r["recommendation_id"], beekeeper_id)

        # Re-evaluate so the dashboard reflects the fresh state
        return QueenService.evaluate_hive(hive_id, persist=True)