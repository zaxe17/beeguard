from config.database import Database
from utils.id_generator import next_recommendation_id


class QueenRecommendationModel:
    TABLE = "queen_recommendations"

    # ── READ ──────────────────────────────────
    @staticmethod
    def latest_open_for_hive(hive_id: str, conn=None):
        """
        Most-recent unresolved recommendation for a hive (ANY level,
        including 'Normal'). Used only for de-dupe inside
        QueenService.evaluate_hive() — NOT for display — so 'Normal'
        stays included here to correctly detect "nothing changed since
        last evaluation."

        `conn` MUST be passed through when the caller (evaluate_hive)
        is running inside an existing transaction (e.g. from
        YieldService.add_harvest, or a second evaluate_hive call on
        the same not-yet-committed conn). Without it, this read goes
        out on a separate connection and won't see a row this same
        transaction already inserted-but-not-committed — the dedupe
        then thinks there's no open recommendation and inserts a
        SECOND open row for the same hive, which is what made
        dashboard_summary()'s recommendations.open count (rows, not
        hives) exceed the actual number of hives needing attention.
        """
        sql = f"""
            SELECT * FROM {QueenRecommendationModel.TABLE}
            WHERE hive_id = %s AND resolved_at IS NULL
            ORDER BY evaluated_at DESC
            LIMIT 1
        """
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(sql, (hive_id,))
                return cur.fetchone()
        return Database.execute(sql, (hive_id,), fetchone=True)

    @staticmethod
    def list_open_for_beekeeper(beekeeper_id: str, min_level: str | None = None):
        """
        Open (unresolved), ACTIONABLE recommendations for a beekeeper.

        'Normal' rows are logging-only — a hive evaluating as Normal
        is never something the beekeeper needs to act on, and it never
        gets explicitly resolved (confirm_replacement only resolves
        Monitor/Replace). So it's EXCLUDED here unconditionally, even
        without a min_level filter — otherwise a Normal hive would sit
        "open" forever and inflate dashboard/recommendation counts.

        `min_level='Replace'` narrows further to Replace-only.
        `min_level='Monitor'` narrows to Monitor+Replace (same as the
        unconditional default, kept for explicitness/back-compat).
        """
        clauses = [
            "beekeeper_id = %s",
            "resolved_at IS NULL",
            "level != 'Normal'",
        ]
        params: list = [beekeeper_id]
        if min_level == "Replace":
            clauses.append("level = 'Replace'")
        elif min_level == "Monitor":
            clauses.append("level IN ('Monitor', 'Replace')")
        where = " AND ".join(clauses)
        sql = f"""
            SELECT * FROM {QueenRecommendationModel.TABLE}
            WHERE {where}
            ORDER BY evaluated_at DESC
        """
        return Database.execute(sql, tuple(params), fetchall=True) or []

    @staticmethod
    def history_for_hive(hive_id: str, limit: int = 20):
        sql = f"""
            SELECT * FROM {QueenRecommendationModel.TABLE}
            WHERE hive_id = %s
            ORDER BY evaluated_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (hive_id, int(limit)), fetchall=True) or []

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        rid = next_recommendation_id(conn)
        sql = f"""
            INSERT INTO {QueenRecommendationModel.TABLE}
                (recommendation_id, hive_id, beekeeper_id, level,
                 reason_code, reason,
                 yield_baseline_kg, yield_current_kg, yield_pct,
                 queen_age_days)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                rid,
                data["hive_id"],
                data["beekeeper_id"],
                data["level"],
                data["reason_code"],
                data["reason"],
                data.get("yield_baseline_kg"),
                data.get("yield_current_kg"),
                data.get("yield_pct"),
                data.get("queen_age_days"),
            ))
        return rid

    @staticmethod
    def resolve(recommendation_id: str, beekeeper_id: str) -> int:
        """
        Marks an open recommendation as resolved. Beekeeper-scoped so
        one beekeeper can't resolve another's recommendation.
        """
        sql = f"""
            UPDATE {QueenRecommendationModel.TABLE}
            SET resolved_at = CURRENT_TIMESTAMP
            WHERE recommendation_id = %s
              AND beekeeper_id = %s
              AND resolved_at IS NULL
        """
        return Database.execute(sql, (recommendation_id, beekeeper_id), commit=True)

    @staticmethod
    def resolve_with_conn(conn, recommendation_id: str) -> int:
        """
        Same-tx resolve — used by QueenService.evaluate_hive() to
        auto-close a stale open recommendation the moment a fresh
        evaluation supersedes it (level/reason_code changed), so it
        commits/rolls back together with the new row's INSERT.

        Without this, a hive that transitions Monitor -> Replace ->
        Monitor (etc.) across harvests leaves EVERY prior open row
        unresolved — one hive ends up with multiple "open" rows,
        inflating AnalyticsService.dashboard_summary()'s
        recommendations.open count above the actual number of hives
        that need attention. Not beekeeper-scoped (unlike resolve())
        because this is a system-triggered supersede, not a user action.
        """
        sql = f"""
            UPDATE {QueenRecommendationModel.TABLE}
            SET resolved_at = CURRENT_TIMESTAMP
            WHERE recommendation_id = %s AND resolved_at IS NULL
        """
        with conn.cursor() as cur:
            return cur.execute(sql, (recommendation_id,))

    @staticmethod
    def acknowledge(recommendation_id: str, beekeeper_id: str) -> int:
        sql = f"""
            UPDATE {QueenRecommendationModel.TABLE}
            SET acknowledged_at = CURRENT_TIMESTAMP
            WHERE recommendation_id = %s
              AND beekeeper_id = %s
              AND acknowledged_at IS NULL
        """
        return Database.execute(sql, (recommendation_id, beekeeper_id), commit=True)