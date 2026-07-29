from config.database import Database
from utils.id_generator import next_alert_id


class AlertModel:
    TABLE = "alerts"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(alert_id: str):
        sql = f"SELECT * FROM {AlertModel.TABLE} WHERE alert_id = %s LIMIT 1"
        return Database.execute(sql, (alert_id,), fetchone=True)

    @staticmethod
    def list_for_admin(admin_id: str, limit: int = 100):
        sql = f"""
            SELECT * FROM {AlertModel.TABLE}
            WHERE adminID = %s
            ORDER BY scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (admin_id, int(limit)), fetchall=True) or []

    @staticmethod
    def list_active(limit: int = 100):
        """Alerts that haven't expired yet (or have no expiry)."""
        sql = f"""
            SELECT * FROM {AlertModel.TABLE}
            WHERE expiration_date IS NULL OR expiration_date >= NOW()
            ORDER BY scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (int(limit),), fetchall=True) or []

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, limit: int = 50):
        """Alerts this beekeeper was actually matched/notified for."""
        sql = f"""
            SELECT a.*, ar.distance_km, ar.notified_at, ar.recipient_id
            FROM {AlertModel.TABLE} a
            JOIN alert_recipients ar ON ar.alert_id = a.alert_id
            WHERE ar.beekeeper_id = %s
            ORDER BY a.scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (beekeeper_id, int(limit)), fetchall=True) or []

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        aid = next_alert_id(conn)
        sql = f"""
            INSERT INTO {AlertModel.TABLE}
                (alert_id, adminID, beekeeperID, title, pesticide_type,
                 affected_area, latitude, longitude, scheduled_date,
                 expiration_date, danger_radius_km, risk_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                aid,
                data["admin_id"],
                data.get("beekeeper_id"),  # NULL for broadcast alerts
                data["title"],
                data.get("pesticide_type"),
                data.get("affected_area"),
                data["latitude"],
                data["longitude"],
                data["scheduled_date"],
                data.get("expiration_date"),
                data["danger_radius_km"],
                data.get("risk_level", "Medium"),
            ))
        return aid