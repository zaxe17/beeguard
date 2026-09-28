from config.database import Database
from utils.id_generator import sync_next_value


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

    # NEW — Forgot Password. `hashed_password` is already bcrypt-hashed
    # (AuthService.hash_password).
    @staticmethod
    def update_password_by_email(email: str, hashed_password: str) -> int:
        sql = f"""
            UPDATE {AdminModel.TABLE}
            SET password = %s
            WHERE email = %s AND deleted_at IS NULL
        """
        return Database.execute(sql, (hashed_password, email), commit=True)

    @staticmethod
    def delete(admin_id: str) -> int:
        """
        Hard delete. Will raise an IntegrityError (foreign key
        constraint) if this admin still has related alerts
        referencing them with ON DELETE RESTRICT — handle that at
        the service/route layer with a friendly message, or
        remove/reassign those dependents first.
        """
        sql = f"DELETE FROM {AdminModel.TABLE} WHERE adminID = %s"
        result = Database.execute(sql, (admin_id,), commit=True)
        sync_next_value("admin")
        return result