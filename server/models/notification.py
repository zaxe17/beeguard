"""
Notification model — thin wrapper over the existing `notifications`
table. IDs are timestamp + random-suffix strings (see migration 006
for the VARCHAR(25) widening this required).

Migration 012: a notification belongs to EITHER a beekeeper
(beekeeperID) OR a citizen (citizenID). Migration 018 adds admins
(adminID). Exactly one of the three is set. The read/update helpers
take the logged-in user's role so each side only ever sees its own rows.
"""
import datetime as dt
import secrets

from config.database import Database


def _owner_col(role: str) -> str:
    if role == "citizen":
        return "citizenID"
    if role == "admin":
        return "adminID"
    return "beekeeperID"


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

    # ── READ (any role) ──────────────────────
    @staticmethod
    def list_for(role: str, user_id: str, unread_only: bool = False, limit: int = 50):
        col = _owner_col(role)
        extra = "AND is_read = FALSE" if unread_only else ""
        sql = f"""
            SELECT * FROM {NotificationModel.TABLE}
            WHERE {col} = %s {extra}
            ORDER BY created_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (user_id, int(limit)), fetchall=True) or []

    @staticmethod
    def count_unread_for(role: str, user_id: str) -> int:
        col = _owner_col(role)
        sql = f"""
            SELECT COUNT(*) AS c FROM {NotificationModel.TABLE}
            WHERE {col} = %s AND is_read = FALSE
        """
        row = Database.execute(sql, (user_id,), fetchone=True) or {}
        return int(row.get("c", 0) or 0)

    # Kept for existing beekeeper-only callers.
    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, unread_only: bool = False, limit: int = 50):
        return NotificationModel.list_for("beekeeper", beekeeper_id, unread_only, limit)

    @staticmethod
    def count_unread(beekeeper_id: str) -> int:
        return NotificationModel.count_unread_for("beekeeper", beekeeper_id)

    # ── WRITE ────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """
        data: exactly ONE of beekeeper_id / citizen_id / admin_id, plus
        alert_id, report_id, title, message, notification_type.
        """
        beekeeper_id = data.get("beekeeper_id")
        citizen_id = data.get("citizen_id")
        admin_id = data.get("admin_id")
        if sum(bool(x) for x in (beekeeper_id, citizen_id, admin_id)) != 1:
            raise ValueError(
                "A notification needs exactly one of beekeeper_id / citizen_id / admin_id."
            )

        nid = NotificationModel._gen_id()
        sql = f"""
            INSERT INTO {NotificationModel.TABLE}
                (notification_id, beekeeperID, citizenID, adminID, alert_id, reportID,
                 title, message, notification_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                nid,
                beekeeper_id,
                citizen_id,
                admin_id,
                data.get("alert_id"),
                data.get("report_id"),
                data["title"],
                data["message"],
                data["notification_type"],
            ))

        # Also send it as a push notification (phone / computer pop-up).
        # Queued only — it's sent after this transaction commits, and
        # never breaks saving the notification.
        try:
            from services.push_service import PushService  # lazy: avoids import cycle
            PushService.queue(
                nid,
                "beekeeper" if beekeeper_id else ("citizen" if citizen_id else "admin"),
                beekeeper_id or citizen_id or admin_id,
                data["title"],
                data["message"],
                data["notification_type"],
                alert_id=data.get("alert_id"),
                report_id=data.get("report_id"),
            )
        except Exception as e:
            print(f"[PUSH] Not queued for {nid}: {e}")
        return nid

    @staticmethod
    def mark_read_for(notification_id: str, role: str, user_id: str) -> int:
        col = _owner_col(role)
        sql = f"""
            UPDATE {NotificationModel.TABLE}
            SET is_read = TRUE
            WHERE notification_id = %s AND {col} = %s
        """
        return Database.execute(sql, (notification_id, user_id), commit=True)

    @staticmethod
    def mark_all_read_for(role: str, user_id: str) -> int:
        col = _owner_col(role)
        sql = f"""
            UPDATE {NotificationModel.TABLE}
            SET is_read = TRUE
            WHERE {col} = %s AND is_read = FALSE
        """
        return Database.execute(sql, (user_id,), commit=True)

    # Kept for existing beekeeper-only callers.
    @staticmethod
    def mark_read(notification_id: str, beekeeper_id: str) -> int:
        return NotificationModel.mark_read_for(notification_id, "beekeeper", beekeeper_id)

    @staticmethod
    def mark_all_read(beekeeper_id: str) -> int:
        return NotificationModel.mark_all_read_for("beekeeper", beekeeper_id)