# services/follow_service.py
from models.beekeeper import BeekeeperModel
from models.follow import FollowModel


class FollowService:

    @staticmethod
    def follow(citizen_id: str, beekeeper_id: str) -> dict:
        if not BeekeeperModel.find_by_id(beekeeper_id):
            raise ValueError("Beekeeper not found.")
        FollowModel.follow(citizen_id, beekeeper_id)
        return {"beekeeperID": beekeeper_id, "following": True}

    @staticmethod
    def unfollow(citizen_id: str, beekeeper_id: str) -> dict:
        FollowModel.unfollow(citizen_id, beekeeper_id)
        return {"beekeeperID": beekeeper_id, "following": False}

    @staticmethod
    def status(citizen_id: str, beekeeper_id: str) -> dict:
        return {
            "beekeeperID": beekeeper_id,
            "following": FollowModel.is_following(citizen_id, beekeeper_id),
        }