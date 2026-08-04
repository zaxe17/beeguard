from config.database import Database
from utils.id_generator import next_alert_recipient_id


class AlertRecipientModel:
    TABLE = "alert_recipients"

    @staticmethod
    def list_for_alert(alert_id: str):
        sql = f"""
            SELECT * FROM {AlertRecipientModel.TABLE}
            WHERE alert_id = %s
            ORDER BY distance_km ASC
        """
        return Database.execute(sql, (alert_id,), fetchall=True) or []

    @staticmethod
    def is_recipient(alert_id: str, beekeeper_id: str) -> bool:
        """Used to authorize GET /alerts/<id> — a beekeeper can view an
        alert's details if they were actually matched/notified for it,
        even if they didn't author it."""
        sql = f"""
            SELECT 1 FROM {AlertRecipientModel.TABLE}
            WHERE alert_id = %s AND beekeeper_id = %s
            LIMIT 1
        """
        row = Database.execute(sql, (alert_id, beekeeper_id), fetchone=True)
        return row is not None

    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        rid = next_alert_recipient_id(conn)
        sql = f"""
            INSERT INTO {AlertRecipientModel.TABLE}
                (recipient_id, alert_id, beekeeper_id, distance_km, notification_id)
            VALUES (%s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                rid,
                data["alert_id"],
                data["beekeeper_id"],
                data.get("distance_km"),
                data.get("notification_id"),
            ))
        return rid