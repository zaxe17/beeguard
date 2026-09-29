# models/alert.py

from config.database import Database
from utils.id_generator import next_alert_id

# alerts.approval_status (Migration 014)
APPROVAL_PENDING = "Pending"
APPROVAL_APPROVED = "Approved"
APPROVAL_REJECTED = "Rejected"
APPROVAL_STATUSES = (APPROVAL_PENDING, APPROVAL_APPROVED, APPROVAL_REJECTED)


class AlertModel:
    TABLE = "alerts"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(alert_id: str):
        sql = f"SELECT * FROM {AlertModel.TABLE} WHERE alert_id = %s LIMIT 1"
        return Database.execute(sql, (alert_id,), fetchone=True)

    @staticmethod
    def find_by_id_for_update(conn, alert_id: str):
        """Locks the alert row inside a transaction (approve / reject)."""
        sql = f"SELECT * FROM {AlertModel.TABLE} WHERE alert_id = %s LIMIT 1 FOR UPDATE"
        with conn.cursor() as cur:
            cur.execute(sql, (alert_id,))
            return cur.fetchone()

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
    def list_for_review(status: str | None = None, limit: int = 300):
        """
        Admin Alerts page: every alert (optionally only one approval
        status) with who reported it. Pending ones come first, oldest
        first, so the admin reviews them in the order they came in.
        """
        where, params = "", []
        if status in APPROVAL_STATUSES:
            where = "WHERE a.approval_status = %s"
            params.append(status)
        params.append(int(limit))
        sql = f"""
            SELECT
                a.*,
                admin.admin_name AS admin_name,
                bk.name          AS reporter_name,
                bk.contact_no    AS reporter_contact,
                bk.farm_name     AS reporter_farm
            FROM {AlertModel.TABLE} a
            LEFT JOIN admins admin
                ON admin.adminID = a.adminID
            LEFT JOIN beekeepers bk
                ON bk.beekeeperID = a.reported_by_beekeeper_id
            {where}
            ORDER BY (a.approval_status = 'Pending') DESC,
                     CASE WHEN a.approval_status = 'Pending' THEN a.created_at END ASC,
                     a.scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, tuple(params), fetchall=True) or []

    @staticmethod
    def count_pending() -> int:
        row = Database.execute(
            f"SELECT COUNT(*) AS c FROM {AlertModel.TABLE} WHERE approval_status = %s",
            (APPROVAL_PENDING,),
            fetchone=True,
        ) or {}
        return int(row.get("c", 0) or 0)

    @staticmethod
    def list_active(limit: int = 100, beekeeper_id: str | None = None,
                    include_past: bool = False, only_expired: bool = False):
        """
        Default: only alerts that are still valid (expiration_date not
        passed yet — every alert gets scheduled_date + 14 days, see
        PesticideService.ALERT_VALIDITY_DAYS).
        include_past=True also returns alerts whose expiration_date has
        passed.
        only_expired=True returns ONLY the ended ones (History).

        Dates are stored in UTC, so they're compared with UTC_TIMESTAMP()
        (NOW() is Philippine time on our connection — 8 hours off).

        Only APPROVED alerts are shown. A beekeeper also sees their own
        alerts that are still waiting for admin approval (so they know
        it was received) — nobody else does.

        Personalizes risk_level for a beekeeper viewer: their own
        distance-derived severity when matched as a recipient,
        otherwise "Low" — never the alert's global risk_level, since
        being outside the danger radius means it isn't a real personal
        threat regardless of what severity the creator picked overall.
        """
        if only_expired:
            expiry_sql = (
                "a.expiration_date IS NOT NULL AND a.expiration_date < UTC_TIMESTAMP()"
            )
        elif include_past:
            expiry_sql = "1 = 1"
        else:
            expiry_sql = "a.expiration_date IS NULL OR a.expiration_date >= UTC_TIMESTAMP()"
        if beekeeper_id:
            sql = f"""
                SELECT a.*, ar.distance_km, ar.notified_at, ar.recipient_id,
                       COALESCE(ar.risk_level, 'Low') AS effective_risk_level
                FROM {AlertModel.TABLE} a
                LEFT JOIN alert_recipients ar
                    ON ar.alert_id = a.alert_id AND ar.beekeeper_id = %s
                WHERE ({expiry_sql})
                  AND (
                        a.approval_status = 'Approved'
                     OR (a.approval_status = 'Pending'
                         AND a.reported_by_beekeeper_id = %s)
                  )
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

        sql = f"""
            SELECT * FROM {AlertModel.TABLE} a
            WHERE ({expiry_sql})
              AND a.approval_status = 'Approved'
            ORDER BY scheduled_date DESC
            LIMIT %s
        """
        return Database.execute(sql, (int(limit),), fetchall=True) or []

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, limit: int = 50):
        """
        Alerts relevant to this beekeeper's own dashboard/"mine" feed:
        matched as a recipient (only happens once an alert is approved),
        OR self-authored (any approval status, so they can see whether
        their alert is still pending or was rejected).

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
            WHERE (ar.recipient_id IS NOT NULL AND a.approval_status = 'Approved')
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

        approval_status: 'Pending' for beekeeper-reported alerts
        (waiting for an admin), 'Approved' for admin-created ones.
        """
        aid = next_alert_id(conn)
        sql = f"""
            INSERT INTO {AlertModel.TABLE}
                (alert_id, adminID, reported_by_beekeeper_id,
                 source, title, description, pesticide_type,
                 application_method, affected_area, latitude, longitude,
                 scheduled_date, expiration_date, danger_radius_km, risk_level,
                 approval_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                data.get("approval_status", APPROVAL_APPROVED),
            ))
        return aid

    @staticmethod
    def set_approval_with_conn(conn, alert_id: str, status: str, admin_id: str,
                               rejection_reason: str | None = None) -> None:
        sql = f"""
            UPDATE {AlertModel.TABLE}
            SET approval_status = %s,
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = %s,
                rejection_reason = %s
            WHERE alert_id = %s
        """
        with conn.cursor() as cur:
            cur.execute(sql, (status, admin_id, rejection_reason, alert_id))