# models/alert.py

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
    def find_detail_by_id(alert_id: str):
        """
        Same row as find_by_id, plus whoever issued it — joined in so
        the Alert Details page can show "Issued By" / "Contact" without
        a second round trip. Both joins are LEFT joins because exactly
        one of adminID / reported_by_beekeeper_id is set per alert
        (enforced by chk_alerts_source_actor), so only one side ever
        actually matches.
        """
        sql = f"""
            SELECT
                a.*,
                admin.admin_name AS admin_name,
                admin.contact_no AS admin_contact,
                bk.name          AS reporter_name,
                bk.contact_no    AS reporter_contact
            FROM {AlertModel.TABLE} a
            LEFT JOIN admins admin
                ON admin.adminID = a.adminID
            LEFT JOIN beekeepers bk
                ON bk.beekeeperID = a.reported_by_beekeeper_id
            WHERE a.alert_id = %s
            LIMIT 1
        """
        return Database.execute(sql, (alert_id,), fetchone=True)

    @staticmethod
    def list_for_admin(admin_id: str, limit: int = 100):
        """Alerts an ADMIN authored (source='admin'). Beekeeper-authored
        self-reports never show up here — see list_reported_by_beekeeper
        if that view is ever needed."""
        sql = f"""
            SELECT * FROM {AlertModel.TABLE}
            WHERE adminID = %s
            ORDER BY scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (admin_id, int(limit)), fetchall=True) or []

    @staticmethod
    def list_active(limit: int = 100):
        """Alerts that haven't expired yet (or have no expiry), regardless
        of source — admin-issued and beekeeper self-reported both count."""
        sql = f"""
            SELECT * FROM {AlertModel.TABLE}
            WHERE expiration_date IS NULL OR expiration_date >= NOW()
            ORDER BY scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (int(limit),), fetchall=True) or []

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, limit: int = 50):
        """Alerts this beekeeper was actually matched/notified for (as a
        RECIPIENT) — unrelated to whether they authored any alerts."""
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
        """
        data:
          source ("admin" | "beekeeper"), title, description,
          pesticide_type, application_method, affected_area, latitude,
          longitude, scheduled_date, expiration_date, danger_radius_km,
          risk_level, admin_id (required when source="admin"),
          reported_by_beekeeper_id (required when source="beekeeper")
        """
        aid = next_alert_id(conn)
        sql = f"""
            INSERT INTO {AlertModel.TABLE}
                (alert_id, adminID, beekeeperID, reported_by_beekeeper_id,
                 source, title, description, pesticide_type,
                 application_method, affected_area, latitude, longitude,
                 scheduled_date, expiration_date, danger_radius_km, risk_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                aid,
                data.get("admin_id"),                    # NULL when beekeeper-authored
                None,                                     # legacy single-target column — unused
                data.get("reported_by_beekeeper_id"),     # NULL when admin-authored
                data["source"],
                data["title"],
                data.get("description"),
                data.get("pesticide_type"),
                data.get("application_method"),
                data.get("affected_area"),
                data["latitude"],
                data["longitude"],
                data["scheduled_date"],
                data.get("expiration_date"),
                data["danger_radius_km"],
                data.get("risk_level", "Medium"),
            ))
        return aid