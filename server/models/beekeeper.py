from config.database import Database


class BeekeeperModel:
    TABLE = "beekeepers"

    @staticmethod
    def find_by_username_or_email(identifier: str):
        sql = f"""
            SELECT * FROM {BeekeeperModel.TABLE}
            WHERE (username = %s OR email = %s) AND deleted_at IS NULL
            LIMIT 1
        """
        return Database.execute(sql, (identifier, identifier), fetchone=True)

    @staticmethod
    def exists_username(username: str) -> bool:
        sql = f"SELECT 1 FROM {BeekeeperModel.TABLE} WHERE username = %s LIMIT 1"
        return Database.execute(sql, (username,), fetchone=True) is not None

    @staticmethod
    def exists_email(email: str) -> bool:
        sql = f"SELECT 1 FROM {BeekeeperModel.TABLE} WHERE email = %s LIMIT 1"
        return Database.execute(sql, (email,), fetchone=True) is not None

    @staticmethod
    def insert(data: dict) -> int:
        sql = f"""
            INSERT INTO {BeekeeperModel.TABLE}
                (beekeeperID, name, citizenship, address, latitude, longitude,
                 username, password, contact_no, email, farm_name, apiary_type,
                 terms_accepted)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            data["beekeeperID"],
            data["name"],
            data["citizenship"],
            data.get("address"),
            data.get("latitude"),
            data["longitude"],
            data["username"],
            data["password"],
            data["contact_no"],
            data["email"],
            data.get("farm_name"),
            data["apiary_type"],
            data["terms_accepted"],
        )
        return Database.execute(sql, params, commit=True)

    @staticmethod
    def find_by_id(beekeeper_id: str):
        sql = f"SELECT * FROM {BeekeeperModel.TABLE} WHERE beekeeperID = %s LIMIT 1"
        return Database.execute(sql, (beekeeper_id,), fetchone=True)
