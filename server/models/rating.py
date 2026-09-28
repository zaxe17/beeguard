# models/rating.py

from config.database import Database
from utils.id_generator import next_rating_id


class RatingModel:
    TABLE = "ratings"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_offer(offer_id: str):
        sql = f"SELECT * FROM {RatingModel.TABLE} WHERE offer_id = %s LIMIT 1"
        return Database.execute(sql, (offer_id,), fetchone=True)

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, limit: int = 50):
        sql = f"""
            SELECT rt.*, c.name AS citizen_name
            FROM {RatingModel.TABLE} rt
            JOIN citizens c ON c.citizenID = rt.citizenID
            WHERE rt.beekeeperID = %s
            ORDER BY rt.created_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (beekeeper_id, int(limit)), fetchall=True) or []

    @staticmethod
    def aggregate_for_beekeeper(beekeeper_id: str) -> dict:
        sql = f"""
            SELECT COUNT(*) AS count,
                   COALESCE(AVG(rating_value), 0) AS average
            FROM {RatingModel.TABLE}
            WHERE beekeeperID = %s
        """
        row = Database.execute(sql, (beekeeper_id,), fetchone=True) or {}
        return {
            "count": int(row.get("count", 0) or 0),
            "average": round(float(row.get("average", 0) or 0), 2),
        }

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """data: offer_id, citizen_id, beekeeper_id, rating_value, comment"""
        rating_id = next_rating_id(conn)
        sql = f"""
            INSERT INTO {RatingModel.TABLE}
                (rating_id, offer_id, citizenID, beekeeperID, rating_value, comment)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                rating_id,
                data["offer_id"],
                data["citizen_id"],
                data["beekeeper_id"],
                data["rating_value"],
                data.get("comment"),
            ))
        return rating_id
