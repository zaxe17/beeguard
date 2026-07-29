from config.database import Database
from utils.id_generator import next_recommendation_id


class QueenRecommendationModel:
    TABLE = "queen_recommendations"

    # ── READ ──────────────────────────────────
    @staticmethod
    def latest_open_for_hive(hive_id: str):
        """Most-recent unresolved recommendation for a hive (any level)."""
        sql = f"""
            SELECT * FROM {QueenRecommendationModel.TABLE}
            WHERE hive_id = %s AND resolved_at IS NULL
            ORDER BY evaluated_at DESC
            LIMIT 1
        """
        return Database.execute(sql, (hive_id,), fetchone=True)

    @staticmethod
    def list_open_for_beekeeper(beekeeper_id: str, min_level: str | None = None):
        """
        Open (unresolved) recommendations for a beekeeper.
        `min_level='Replace'` filters to actionable ones only.
        """
        clauses = ["beekeeper_id = %s", "resolved_at IS NULL"]
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
    def acknowledge(recommendation_id: str, beekeeper_id: str) -> int:
        sql = f"""
            UPDATE {QueenRecommendationModel.TABLE}
            SET acknowledged_at = CURRENT_TIMESTAMP
            WHERE recommendation_id = %s
              AND beekeeper_id = %s
              AND acknowledged_at IS NULL
        """
        return Database.execute(sql, (recommendation_id, beekeeper_id), commit=True)