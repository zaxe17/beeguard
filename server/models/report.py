# models/report.py
#
# Citizen bee-sighting/rescue reports. Not to be confused with the
# beekeeper YIELD report feature (services/report_service.py,
# routes/report.py) — different table, different domain entirely.

from config.database import Database
from utils.id_generator import next_report_id


class ReportModel:
    TABLE = "reports"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(report_id: str):
        sql = f"SELECT * FROM {ReportModel.TABLE} WHERE reportID = %s LIMIT 1"
        return Database.execute(sql, (report_id,), fetchone=True)

    @staticmethod
    def find_by_id_and_citizen(report_id: str, citizen_id: str):
        sql = f"""
            SELECT * FROM {ReportModel.TABLE}
            WHERE reportID = %s AND citizenID = %s
            LIMIT 1
        """
        return Database.execute(sql, (report_id, citizen_id), fetchone=True)

    @staticmethod
    def list_by_citizen(citizen_id: str, limit: int = 50):
        sql = f"""
            SELECT * FROM {ReportModel.TABLE}
            WHERE citizenID = %s
            ORDER BY reported_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (citizen_id, int(limit)), fetchall=True) or []

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """
        data:
          citizen_id, cvscan_id, image_url, ai_species_identified,
          sighted_at (nullable), latitude, longitude, bee_danger
          ("Yes"/"No"), description (nullable, max 50 chars —
          schema-limited, see report_validator.py note),
          payment_method (default 'Cash' at the DB level if omitted)
        """
        report_id = next_report_id(conn)
        sql = f"""
            INSERT INTO {ReportModel.TABLE}
                (reportID, citizenID, cvscan_id, image_url,
                 ai_species_identified, sighted_at,
                 latitude, longitude, bee_danger, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                report_id,
                data["citizen_id"],
                data["cvscan_id"],
                data["image_url"],
                data["ai_species_identified"],
                data.get("sighted_at"),
                data["latitude"],
                data["longitude"],
                data["bee_danger"],
                data.get("description"),
            ))
        return report_id

    @staticmethod
    def mark_resolved(conn, report_id: str) -> int:
        """
        NEW (migration 007 / rescue offer flow) — called from
        RescueOfferService.resolve() on the SAME connection/transaction
        as the offer's status update, so the report and its winning
        offer flip to their final state atomically.
        """
        sql = f"""
            UPDATE {ReportModel.TABLE}
            SET status = 'Resolved', resolved_at = CURRENT_TIMESTAMP
            WHERE reportID = %s
        """
        with conn.cursor() as cur:
            return cur.execute(sql, (report_id,))

    @staticmethod
    def cancel_with_conn(conn, report_id: str) -> int:
        """
        Migration 011 — citizen cancels their report. Only an open
        report (Pending / In Progress) can be cancelled; returns 0 if
        it had already moved on. Any offers still Pending or Accepted
        are rejected in the same transaction, so no beekeeper is left
        thinking the job is still on.
        """
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {ReportModel.TABLE}
                SET status = 'Cancelled', cancelled_at = CURRENT_TIMESTAMP
                WHERE reportID = %s AND status IN ('Pending', 'In Progress')
                """,
                (report_id,),
            )
            updated = cur.rowcount
            if updated:
                cur.execute(
                    """
                    UPDATE rescue_offers
                    SET offer_status = 'Rejected'
                    WHERE report_id = %s AND offer_status IN ('Pending', 'Accepted')
                    """,
                    (report_id,),
                )
            return updated

    # ── BEEKEEPER SIDE (Report tab) ───────────
    # One row per report, joined with the citizen's name and THIS
    # beekeeper's own latest offer on it (if any) + the rating the
    # citizen gave that offer. The correlated subquery picks a single
    # offer so a report never shows up twice.
    _BEEKEEPER_SELECT = """
        SELECT r.reportID, r.citizenID, r.image_url, r.ai_species_identified,
               r.latitude, r.longitude, r.bee_danger, r.description, r.status,
               r.sighted_at, r.reported_at, r.resolved_at, r.cancelled_at,
               c.name AS citizen_name,
               mo.offer_id     AS my_offer_id,
               mo.offered_fee  AS my_offered_fee,
               mo.offer_status AS my_offer_status,
               rt.rating_value AS my_rating,
               (SELECT COUNT(*) FROM rescue_offers oc
                 WHERE oc.report_id = r.reportID AND oc.beekeeperID = %s) AS my_offer_count
        FROM reports r
        JOIN citizens c ON c.citizenID = r.citizenID
        LEFT JOIN rescue_offers mo ON mo.offer_id = (
            SELECT o.offer_id FROM rescue_offers o
            WHERE o.report_id = r.reportID AND o.beekeeperID = %s
            ORDER BY o.created_at DESC
            LIMIT 1
        )
        LEFT JOIN ratings rt ON rt.offer_id = mo.offer_id
    """

    @staticmethod
    def list_for_beekeeper_feed(beekeeper_id: str, limit: int = 200):
        """
        Reports a beekeeper can see: every report still waiting for a
        rescuer (status Pending), plus any report this beekeeper has
        already made an offer on (whatever its status now).
        """
        sql = ReportModel._BEEKEEPER_SELECT + """
            WHERE r.status = 'Pending' OR mo.offer_id IS NOT NULL
            ORDER BY r.reported_at DESC
            LIMIT %s
        """
        # beekeeper_id twice: my_offer_count + my latest offer (mo)
        return Database.execute(
            sql, (beekeeper_id, beekeeper_id, int(limit)), fetchall=True
        ) or []

    @staticmethod
    def find_for_beekeeper(beekeeper_id: str, report_id: str):
        sql = ReportModel._BEEKEEPER_SELECT + """
            WHERE r.reportID = %s
            LIMIT 1
        """
        return Database.execute(
            sql, (beekeeper_id, beekeeper_id, report_id), fetchone=True
        )