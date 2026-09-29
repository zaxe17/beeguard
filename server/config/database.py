# config/database.py
import os

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


class Database:
    """MySQL connection pool wrapper. All queries use parameterized statements."""

    _pool = None

    @classmethod
    def init_pool(cls):
        if cls._pool is None:
            cls._pool = PooledDB(
                creator=pymysql,
                maxconnections=10,
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