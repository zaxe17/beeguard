from config.database import Database


class AdminModel:
    TABLE = "admins"

    @staticmethod
    def find_by_email(email: str):
        sql = f"""
            SELECT * FROM {AdminModel.TABLE}
            WHERE email = %s AND deleted_at IS NULL
            LIMIT 1
        """
        return Database.execute(sql, (email,), fetchone=True)

    @staticmethod
    def find_by_id(admin_id: str):
        sql = f"SELECT * FROM {AdminModel.TABLE} WHERE adminID = %s LIMIT 1"
        return Database.execute(sql, (admin_id,), fetchone=True)
