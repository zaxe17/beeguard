# models/follow.py
#
# citizen -> beekeeper "Follow" relationship. Composite PK
# (citizenID, beekeeperID) — no id_generator involvement, same as
# other pure join tables in this schema.

from config.database import Database


class FollowModel:
    TABLE = "follows"

    @staticmethod
    def is_following(citizen_id: str, beekeeper_id: str) -> bool:
        sql = f"""
            SELECT 1 FROM {FollowModel.TABLE}
            WHERE citizenID = %s AND beekeeperID = %s
            LIMIT 1
        """
        return Database.execute(sql, (citizen_id, beekeeper_id), fetchone=True) is not None

    @staticmethod
    def follow(citizen_id: str, beekeeper_id: str) -> int:
        # INSERT IGNORE — following twice is a no-op, not an error
        # (the composite PK would otherwise raise a duplicate-key error).
        sql = f"""
            INSERT IGNORE INTO {FollowModel.TABLE} (citizenID, beekeeperID)
            VALUES (%s, %s)
        """
        return Database.execute(sql, (citizen_id, beekeeper_id), commit=True)

    @staticmethod
    def unfollow(citizen_id: str, beekeeper_id: str) -> int:
        sql = f"""
            DELETE FROM {FollowModel.TABLE}
            WHERE citizenID = %s AND beekeeperID = %s
        """
        return Database.execute(sql, (citizen_id, beekeeper_id), commit=True)

    @staticmethod
    def count_for_beekeeper(beekeeper_id: str) -> int:
        sql = f"""
            SELECT COUNT(*) AS c FROM {FollowModel.TABLE}
            WHERE beekeeperID = %s
        """
        row = Database.execute(sql, (beekeeper_id,), fetchone=True) or {}
        return int(row.get("c", 0) or 0)