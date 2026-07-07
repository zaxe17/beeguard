import pymysql
from dbutils.pooled_db import PooledDB
from config.config import Config


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
