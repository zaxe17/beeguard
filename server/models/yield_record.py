from config.database import Database
from utils.id_generator import next_yield_id


class YieldModel:
    TABLE = "yields"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_baseline(hive_id: str):
        sql = f"""
            SELECT * FROM {YieldModel.TABLE}
            WHERE hive_id = %s AND is_baseline = TRUE
            LIMIT 1
        """
        return Database.execute(sql, (hive_id,), fetchone=True)

    @staticmethod
    def list_by_hive(hive_id: str, limit: int | None = None):
        limit_sql = f"LIMIT {int(limit)}" if limit else ""
        sql = f"""
            SELECT * FROM {YieldModel.TABLE}
            WHERE hive_id = %s
            ORDER BY yield_date DESC, created_at DESC
            {limit_sql}
        """
        return Database.execute(sql, (hive_id,), fetchall=True) or []

    @staticmethod
    def latest_non_baseline(hive_id: str):
        """The most recent 'real' harvest (excludes the seeded historical row)."""
        sql = f"""
            SELECT * FROM {YieldModel.TABLE}
            WHERE hive_id = %s AND is_baseline = FALSE
            ORDER BY yield_date DESC, created_at DESC
            LIMIT 1
        """
        return Database.execute(sql, (hive_id,), fetchone=True)

    @staticmethod
    def last_n_non_baseline(hive_id: str, n: int = 3):
        sql = f"""
            SELECT * FROM {YieldModel.TABLE}
            WHERE hive_id = %s AND is_baseline = FALSE
            ORDER BY yield_date DESC, created_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (hive_id, int(n)), fetchall=True) or []

    @staticmethod
    def aggregate_for_hive(hive_id: str) -> dict:
        sql = f"""
            SELECT
                COUNT(*)      AS harvests,
                COALESCE(SUM(yield_kg), 0) AS total_kg,
                COALESCE(AVG(yield_kg), 0) AS avg_kg,
                COALESCE(MAX(yield_kg), 0) AS max_kg,
                COALESCE(MIN(yield_kg), 0) AS min_kg
            FROM {YieldModel.TABLE}
            WHERE hive_id = %s AND is_baseline = FALSE
        """
        return Database.execute(sql, (hive_id,), fetchone=True) or {}

    @staticmethod
    def aggregate_for_beekeeper(beekeeper_id: str, since=None, until=None) -> dict:
        clauses = ["h.beekeeper_id = %s", "y.is_baseline = FALSE"]
        params: list = [beekeeper_id]
        if since:
            clauses.append("y.yield_date >= %s"); params.append(since)
        if until:
            clauses.append("y.yield_date <= %s"); params.append(until)
        where = " AND ".join(clauses)
        sql = f"""
            SELECT
                COUNT(*)      AS harvests,
                COALESCE(SUM(y.yield_kg), 0) AS total_kg,
                COALESCE(AVG(y.yield_kg), 0) AS avg_kg,
                COALESCE(MAX(y.yield_kg), 0) AS max_kg,
                COALESCE(MIN(y.yield_kg), 0) AS min_kg
            FROM {YieldModel.TABLE} y
            JOIN hives h ON h.hive_id = y.hive_id
            WHERE {where}
        """
        return Database.execute(sql, tuple(params), fetchone=True) or {}

    @staticmethod
    def monthly_series(beekeeper_id: str, months: int = 12) -> list:
        """Total kg harvested per YYYY-MM for the beekeeper's hives."""
        sql = f"""
            SELECT DATE_FORMAT(y.yield_date, '%%Y-%%m') AS period,
                   COALESCE(SUM(y.yield_kg), 0)        AS total_kg,
                   COUNT(*)                            AS harvests
            FROM {YieldModel.TABLE} y
            JOIN hives h ON h.hive_id = y.hive_id
            WHERE h.beekeeper_id = %s
              AND y.is_baseline = FALSE
              AND y.yield_date >= (CURDATE() - INTERVAL %s MONTH)
            GROUP BY period
            ORDER BY period ASC
        """
        return Database.execute(sql, (beekeeper_id, int(months)), fetchall=True) or []

    @staticmethod
    def this_month_by_hive(beekeeper_id: str) -> list:
        """
        Per-hive total kg harvested in the current calendar month, for
        every hive owned by the beekeeper — including hives with zero
        harvests this month (LEFT JOIN + COALESCE), so the Hives page
        can show "0.0kg" rather than silently omitting a hive.
        """
        sql = """
            SELECT h.hive_id,
                   COALESCE(SUM(
                       CASE
                           WHEN y.is_baseline = FALSE
                            AND YEAR(y.yield_date) = YEAR(CURDATE())
                            AND MONTH(y.yield_date) = MONTH(CURDATE())
                           THEN y.yield_kg
                           ELSE 0
                       END
                   ), 0) AS total_kg
            FROM hives h
            LEFT JOIN yields y ON y.hive_id = h.hive_id
            WHERE h.beekeeper_id = %s
            GROUP BY h.hive_id
        """
        return Database.execute(sql, (beekeeper_id,), fetchall=True) or []

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """
        Reserves a yield_id and inserts. Enforces the "only one baseline
        per hive" rule at the application layer: setting is_baseline=TRUE
        clears any previously-baseline row for the same hive first,
        inside the same transaction.
        """
        hive_id = data["hive_id"]
        yid = next_yield_id(conn)
        is_baseline = bool(data.get("is_baseline", False))

        with conn.cursor() as cur:
            if is_baseline:
                cur.execute(
                    f"UPDATE {YieldModel.TABLE} "
                    f"SET is_baseline = FALSE "
                    f"WHERE hive_id = %s AND is_baseline = TRUE",
                    (hive_id,),
                )
            cur.execute(
                f"""
                INSERT INTO {YieldModel.TABLE}
                    (yield_id, hive_id, yield_date, yield_kg, is_baseline)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (yid, hive_id, data["yield_date"], data["yield_kg"], is_baseline),
            )
        return yid

    @staticmethod
    def insert(data: dict) -> str:
        from config.database import Database as _Db
        conn = _Db.get_connection()
        try:
            yid = YieldModel.insert_with_conn(conn, data)
            conn.commit()
            return yid
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()