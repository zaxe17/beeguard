# config/database.py
import os
import time

import pymysql
from dbutils.pooled_db import PooledDB
from config.config import Config

# Every connection works in Philippine time (UTC+8) and the same text
# collation as the tables:
#   - time_zone: MySQL's NOW() / CURRENT_TIMESTAMP (e.g. reports.reported_at,
#     created_at) follow the SERVER's clock. On Railway that's UTC, so
#     times would be 8 hours behind. Locally (XAMPP on a PH computer) this
#     changes nothing. Override with DB_TIME_ZONE in .env if ever needed.
#   - collation: avoids "Illegal mix of collations" errors when comparing
#     text (all tables use utf8mb4_unicode_ci).
DB_TIME_ZONE = os.getenv("DB_TIME_ZONE", "+08:00")
_INIT_COMMAND = (
    f"SET time_zone = '{DB_TIME_ZONE}', "
    "collation_connection = 'utf8mb4_unicode_ci'"
)

# Pool size can be changed from Railway Variables without editing code.
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))

# Any query slower than this is printed to the logs as "[SLOW SQL]".
# Set SLOW_SQL_MS=0 in Railway Variables to turn the logging off.
SLOW_SQL_MS = int(os.getenv("SLOW_SQL_MS", "150"))


class Database:
    """MySQL connection pool wrapper. All queries use parameterized statements."""

    _pool = None

    @classmethod
    def init_pool(cls):
        if cls._pool is None:
            cls._pool = PooledDB(
                creator=pymysql,
                maxconnections=DB_POOL_MAX,
                mincached=2,
                maxcached=5,
                blocking=True,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=False,
                init_command=_INIT_COMMAND,
                # Don't hang forever if the database is unreachable.
                connect_timeout=10,
            )
        return cls._pool

    @classmethod
    def get_connection(cls):
        if cls._pool is None:
            cls.init_pool()
        return cls._pool.connection()

    @classmethod
    def execute(cls, sql: str, params: tuple = None, fetchone: bool = False, fetchall: bool = False, commit: bool = False):
        started = time.perf_counter()
        conn = cls.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                if commit:
                    conn.commit()
                if fetchone:
                    return cur.fetchone()
                if fetchall:
                    return cur.fetchall()
                return cur.rowcount
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
            if SLOW_SQL_MS:
                elapsed_ms = (time.perf_counter() - started) * 1000
                if elapsed_ms >= SLOW_SQL_MS:
                    print(f"[SLOW SQL] {elapsed_ms:.0f} ms :: {' '.join(sql.split())[:100]}")