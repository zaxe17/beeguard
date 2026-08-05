"""
Notification model — thin wrapper over the existing `notifications`
table. IDs are timestamp + random-suffix strings (see migration 006
for the VARCHAR(25) widening this required).
"""
import datetime as dt
import secrets

from config.database import Database


class NotificationModel:
    TABLE = "notifications"

    @staticmethod
    def _gen_id() -> str:
        # "NT-" + YYMMDDHHMMSS (12 digits, second precision) + 6 hex
        # chars of randomness. The old version used ONLY the
        # second-precision timestamp, which meant every notification
        # created within the same second (e.g. fanning out to several
        # matched beekeepers in PesticideService.create_alert's loop)
        # got the EXACT SAME id — a duplicate PRIMARY KEY that made
        # MySQL reject the insert and roll back the whole alert
        # transaction, silently killing every notification for that
        # alert. The random suffix makes same-second collisions
        # astronomically unlikely (16.7M possible suffixes per second).
        ts = dt.datetime.utcnow().strftime("%y%m%d%H%M%S")
        suffix = secrets.token_hex(3)
        return f"NT-{ts}{suffix}"

    # ── READ ─────────────────────────────────
    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, unread_only: bool = False, limit: int = 50):
        extra = "AND is_read = FALSE" if unread_only else ""
        sql = f"""
            SELECT * FROM {NotificationModel.TABLE}
            WHERE beekeeperID = %s {extra}
            ORDER BY created_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (beekeeper_id, int(limit)), fetchall=True) or []

    @staticmethod
    def count_unread(beekeeper_id: str) -> int:
        sql = f"""
            SELECT COUNT(*) AS c FROM {NotificationModel.TABLE}
            WHERE beekeeperID = %s AND is_read = FALSE
        """
        row = Database.execute(sql, (beekeeper_id,), fetchone=True) or {}
        return int(row.get("c", 0) or 0)

    # ── WRITE ────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        nid = NotificationModel._gen_id()
        sql = f"""
            INSERT INTO {NotificationModel.TABLE}
                (notification_id, beekeeperID, alert_id, reportID,
                 title, message, notification_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                nid,
                data["beekeeper_id"],
                data.get("alert_id"),
                data.get("report_id"),
                data["title"],
                data["message"],
                data["notification_type"],
            ))
        return nid

    @staticmethod
    def mark_read(notification_id: str, beekeeper_id: str) -> int:
        sql = f"""
            UPDATE {NotificationModel.TABLE}
            SET is_read = TRUE
            WHERE notification_id = %s AND beekeeperID = %s
        """
        return Database.execute(sql, (notification_id, beekeeper_id), commit=True)

    @staticmethod
    def mark_all_read(beekeeper_id: str) -> int:
        sql = f"""
            UPDATE {NotificationModel.TABLE}
            SET is_read = TRUE
            WHERE beekeeperID = %s AND is_read = FALSE
        """
        return Database.execute(sql, (beekeeper_id,), commit=True)