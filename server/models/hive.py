# hive.py (models/hive.py)

from config.database import Database
from utils.id_generator import next_hive_id


class HiveModel:
    TABLE = "hives"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(hive_id: str, conn=None):
        """
        `conn`, when passed, reads within the SAME transaction as the
        caller — needed so evaluate_hive() sees any not-yet-committed
        changes made earlier in that same transaction.
        """
        sql = f"SELECT * FROM {HiveModel.TABLE} WHERE hive_id = %s LIMIT 1"
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(sql, (hive_id,))
                return cur.fetchone()
        return Database.execute(sql, (hive_id,), fetchone=True)

    @staticmethod
    def find_by_id_and_beekeeper(hive_id: str, beekeeper_id: str):
        """Ownership-scoped lookup. Returns None if beekeeper does not own it."""
        sql = f"""
            SELECT * FROM {HiveModel.TABLE}
            WHERE hive_id = %s AND beekeeper_id = %s
            LIMIT 1
        """
        return Database.execute(sql, (hive_id, beekeeper_id), fetchone=True)

    @staticmethod
    def list_by_beekeeper(beekeeper_id: str, state: str | None = None):
        sql = f"""
            SELECT * FROM {HiveModel.TABLE}
            WHERE beekeeper_id = %s
              {"AND hive_state = %s" if state else ""}
            ORDER BY created_at DESC
        """
        params = (beekeeper_id, state) if state else (beekeeper_id,)
        return Database.execute(sql, params, fetchall=True) or []

    @staticmethod
    def count_by_beekeeper(beekeeper_id: str) -> dict:
        sql = f"""
            SELECT
                COUNT(*) AS total,
                SUM(hive_state = 'Active')                    AS active,
                SUM(hive_state = 'Inactive')                  AS inactive,
                SUM(health_status = 'Healthy')                AS healthy,
                SUM(health_status = 'Needs Attention')        AS needs_attention,
                SUM(health_status = 'Weak')                   AS weak,
                SUM(health_status = 'Diseased')               AS diseased
            FROM {HiveModel.TABLE}
            WHERE beekeeper_id = %s
        """
        row = Database.execute(sql, (beekeeper_id,), fetchone=True) or {}
        # SUM(...) returns Decimal — cast to int for JSON friendliness
        return {k: int(v or 0) for k, v in row.items()}

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """
        Atomically reserves a hive_id and inserts the row on the given
        connection. Caller must commit.
        Returns the newly-created hive_id.
        """
        hive_id = next_hive_id(conn)
        sql = f"""
            INSERT INTO {HiveModel.TABLE}
                (hive_id, beekeeper_id, hive_name, bee_species,
                 date_established, queen_installed_date,
                 historical_yield_kg, historical_yield_year,
                 health_status, hive_state)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            hive_id,
            data["beekeeper_id"],
            data["hive_name"],
            data["bee_species"],
            data["date_established"],
            data.get("queen_installed_date"),
            data.get("historical_yield_kg"),
            data.get("historical_yield_year"),
            data.get("health_status", "Healthy"),
            data.get("hive_state", "Active"),
        )
        with conn.cursor() as cur:
            cur.execute(sql, params)
        return hive_id

    @staticmethod
    def update_health_status(hive_id: str, beekeeper_id: str, status: str, conn=None) -> int:
        """
        `conn`, when passed, updates within the SAME transaction as the
        caller instead of opening its own connection + committing
        immediately — important when called from inside
        QueenService.evaluate_hive() mid-transaction, so the health
        status change and the recommendation row commit/rollback
        together.
        """
        sql = f"""
            UPDATE {HiveModel.TABLE}
            SET health_status = %s
            WHERE hive_id = %s AND beekeeper_id = %s
        """
        if conn is not None:
            with conn.cursor() as cur:
                return cur.execute(sql, (status, hive_id, beekeeper_id))
        return Database.execute(sql, (status, hive_id, beekeeper_id), commit=True)

    @staticmethod
    def update_queen_installed(conn, hive_id: str, installed_on) -> int:
        """Called when a queen-replacement is confirmed. Same-tx write."""
        sql = f"""
            UPDATE {HiveModel.TABLE}
            SET queen_installed_date = %s
            WHERE hive_id = %s
        """
        with conn.cursor() as cur:
            return cur.execute(sql, (installed_on, hive_id))

    @staticmethod
    def update_state(hive_id: str, beekeeper_id: str, state: str) -> int:
        sql = f"""
            UPDATE {HiveModel.TABLE}
            SET hive_state = %s
            WHERE hive_id = %s AND beekeeper_id = %s
        """
        return Database.execute(sql, (state, hive_id, beekeeper_id), commit=True)