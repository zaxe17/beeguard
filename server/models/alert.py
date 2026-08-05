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
        sql = f"""
            SELECT * FROM {AlertModel.TABLE}
            WHERE adminID = %s
            ORDER BY scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (admin_id, int(limit)), fetchall=True) or []

    @staticmethod
    def list_active(limit: int = 100, beekeeper_id: str | None = None):
        """
        Personalizes risk_level for a beekeeper viewer: their own
        distance-derived severity when matched as a recipient,
        otherwise "Low" — never the alert's global risk_level, since
        being outside the danger radius means it isn't a real personal
        threat regardless of what severity the creator picked overall.
        """
        if beekeeper_id:
            sql = f"""
                SELECT a.*, ar.distance_km, ar.notified_at, ar.recipient_id,
                       COALESCE(ar.risk_level, 'Low') AS effective_risk_level
                FROM {AlertModel.TABLE} a
                LEFT JOIN alert_recipients ar
                    ON ar.alert_id = a.alert_id AND ar.beekeeper_id = %s
                WHERE a.expiration_date IS NULL OR a.expiration_date >= NOW()
                ORDER BY a.scheduled_date DESC
                LIMIT %s
            """
            rows = Database.execute(
                sql, (beekeeper_id, int(limit)), fetchall=True
            ) or []
            for row in rows:
                if "effective_risk_level" in row:
                    row["risk_level"] = row.pop("effective_risk_level")
            return rows

        sql = f"""
            SELECT * FROM {AlertModel.TABLE}
            WHERE expiration_date IS NULL OR expiration_date >= NOW()
            ORDER BY scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (int(limit),), fetchall=True) or []

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, limit: int = 50):
        """
        Alerts relevant to this beekeeper's own dashboard/"mine" feed:
        matched as a recipient, OR self-authored.

        risk_level is PERSONALIZED:
          - Matched as recipient  -> their own distance-derived severity
            (ar.risk_level).
          - Self-authored but NOT matched as a recipient (i.e. their
            own farm sits outside the danger radius they set) -> "Low".
        """
        sql = f"""
            SELECT a.*, ar.distance_km, ar.notified_at, ar.recipient_id,
                   COALESCE(ar.risk_level, 'Low') AS effective_risk_level
            FROM {AlertModel.TABLE} a
            LEFT JOIN alert_recipients ar
                ON ar.alert_id = a.alert_id AND ar.beekeeper_id = %s
            WHERE ar.recipient_id IS NOT NULL
               OR a.reported_by_beekeeper_id = %s
            ORDER BY a.scheduled_date DESC
            LIMIT %s
        """
        rows = Database.execute(
            sql, (beekeeper_id, beekeeper_id, int(limit)), fetchall=True
        ) or []
        for row in rows:
            if "effective_risk_level" in row:
                row["risk_level"] = row.pop("effective_risk_level")
        return rows

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """
        Inserts a new alert. `beekeeperID` (the legacy target-beekeeper
        column from the original schema) is intentionally NOT written
        anymore — it was made nullable in Migration 003.5 and is now
        superseded by `reported_by_beekeeper_id` (the AUTHOR). Target
        beekeepers live in `alert_recipients`.
        """
        aid = next_alert_id(conn)
        sql = f"""
            INSERT INTO {AlertModel.TABLE}
                (alert_id, adminID, reported_by_beekeeper_id,
                 source, title, description, pesticide_type,
                 application_method, affected_area, latitude, longitude,
                 scheduled_date, expiration_date, danger_radius_km, risk_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                aid,
                data.get("admin_id"),
                data.get("reported_by_beekeeper_id"),
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
