# models/rescue_offer.py
#
# A beekeeper's offer to rescue/collect a colony from a citizen's
# `reports` row. Lifecycle: Pending -> Accepted|Rejected (citizen
# responds) -> Resolved (either party marks the job done, unlocking
# a rating). See migration 007.

from config.database import Database
from utils.id_generator import next_offer_id


class RescueOfferModel:
    TABLE = "rescue_offers"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(offer_id: str):
        sql = f"SELECT * FROM {RescueOfferModel.TABLE} WHERE offer_id = %s LIMIT 1"
        return Database.execute(sql, (offer_id,), fetchone=True)

    @staticmethod
    def find_with_context(offer_id: str):
        """
        Offer joined with its report (for citizenID) and the
        beekeeper — used by the service layer for authorization
        checks (accept/reject/resolve) without three round-trips.
        """
        sql = f"""
            SELECT ro.*, r.citizenID, r.status AS report_status,
                   bk.name AS beekeeper_name, bk.farm_name
            FROM {RescueOfferModel.TABLE} ro
            JOIN reports r ON r.reportID = ro.report_id
            JOIN beekeepers bk ON bk.beekeeperID = ro.beekeeperID
            WHERE ro.offer_id = %s
            LIMIT 1
        """
        return Database.execute(sql, (offer_id,), fetchone=True)

    @staticmethod
    def list_by_report(report_id: str):
        # my_rating: the citizen's rating for this offer (ratings has
        # one row per offer — uq_ratings_offer), NULL if not rated yet.
        # Lets the Document page show "already rated" instead of asking
        # again after a refresh.
        sql = f"""
            SELECT ro.*, bk.name AS beekeeper_name, bk.farm_name,
                   bk.contact_no AS beekeeper_contact,
                   rt.rating_value AS my_rating
            FROM {RescueOfferModel.TABLE} ro
            JOIN beekeepers bk ON bk.beekeeperID = ro.beekeeperID
            LEFT JOIN ratings rt ON rt.offer_id = ro.offer_id
            WHERE ro.report_id = %s
            ORDER BY ro.created_at DESC
        """
        return Database.execute(sql, (report_id,), fetchall=True) or []

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, limit: int = 100):
        sql = f"""
            SELECT ro.*, r.latitude, r.longitude, r.bee_danger,
                   r.ai_species_identified, r.citizenID,
                   c.name AS citizen_name
            FROM {RescueOfferModel.TABLE} ro
            JOIN reports r ON r.reportID = ro.report_id
            JOIN citizens c ON c.citizenID = r.citizenID
            WHERE ro.beekeeperID = %s
            ORDER BY ro.created_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (beekeeper_id, int(limit)), fetchall=True) or []

    @staticmethod
    def list_for_citizen(citizen_id: str, limit: int = 100):
        sql = f"""
            SELECT ro.*, bk.name AS beekeeper_name, bk.farm_name,
                   bk.contact_no AS beekeeper_contact
            FROM {RescueOfferModel.TABLE} ro
            JOIN reports r ON r.reportID = ro.report_id
            JOIN beekeepers bk ON bk.beekeeperID = ro.beekeeperID
            WHERE r.citizenID = %s
            ORDER BY ro.created_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (citizen_id, int(limit)), fetchall=True) or []

    @staticmethod
    def count_resolved_for_beekeeper(beekeeper_id: str) -> int:
        sql = f"""
            SELECT COUNT(*) AS c FROM {RescueOfferModel.TABLE}
            WHERE beekeeperID = %s AND offer_status = 'Resolved'
        """
        row = Database.execute(sql, (beekeeper_id,), fetchone=True) or {}
        return int(row.get("c", 0) or 0)

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """data: report_id, beekeeper_id, offered_fee"""
        offer_id = next_offer_id(conn)
        sql = f"""
            INSERT INTO {RescueOfferModel.TABLE}
                (offer_id, report_id, beekeeperID, offered_fee, offer_status)
            VALUES (%s, %s, %s, %s, 'Pending')
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                offer_id,
                data["report_id"],
                data["beekeeper_id"],
                data["offered_fee"],
            ))
        return offer_id

    @staticmethod
    def update_status(offer_id: str, status: str, expected_status: str | None = None) -> int:
        """
        Updates offer_status. If `expected_status` is given, the
        update only applies when the row is currently in that state
        (optimistic guard against double-accept/double-resolve races)
        — returns 0 rows affected if the state already moved on.
        """
        if expected_status is not None:
            sql = f"""
                UPDATE {RescueOfferModel.TABLE}
                SET offer_status = %s,
                    resolved_at = CASE WHEN %s = 'Resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
                WHERE offer_id = %s AND offer_status = %s
            """
            return Database.execute(
                sql, (status, status, offer_id, expected_status), commit=True
            )
        sql = f"""
            UPDATE {RescueOfferModel.TABLE}
            SET offer_status = %s,
                resolved_at = CASE WHEN %s = 'Resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
            WHERE offer_id = %s
        """
        return Database.execute(sql, (status, status, offer_id), commit=True)