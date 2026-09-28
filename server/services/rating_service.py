# services/rating_service.py

from config.database import Database
from models.rating import RatingModel
from models.rescue_offer import RescueOfferModel


class RatingService:

    @staticmethod
    def create_rating(citizen_id: str, payload: dict) -> dict:
        offer = RescueOfferModel.find_with_context(payload["offer_id"])
        if not offer:
            raise ValueError("Offer not found.")
        if offer["citizenID"] != citizen_id:
            raise PermissionError("This offer is not on your report.")
        if offer["offer_status"] != "Resolved":
            raise ValueError("You can only rate a Resolved rescue offer.")
        if RatingModel.find_by_offer(payload["offer_id"]):
            raise ValueError("This offer has already been rated.")

        conn = Database.get_connection()
        try:
            rating_id = RatingModel.insert_with_conn(conn, {
                "offer_id":       payload["offer_id"],
                "citizen_id":     citizen_id,
                "beekeeper_id":   offer["beekeeperID"],
                "rating_value":   payload["rating_value"],
                "comment":        payload.get("comment"),
            })
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return {
            "rating_id": rating_id,
            "offer_id": payload["offer_id"],
            "beekeeper_id": offer["beekeeperID"],
            "rating_value": payload["rating_value"],
            "comment": payload.get("comment"),
        }

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str) -> dict:
        rows = RatingModel.list_for_beekeeper(beekeeper_id)
        aggregate = RatingModel.aggregate_for_beekeeper(beekeeper_id)
        for r in rows:
            if r.get("created_at") is not None:
                r["created_at"] = r["created_at"].isoformat()
        return {"ratings": rows, "average": aggregate["average"], "count": aggregate["count"]}
