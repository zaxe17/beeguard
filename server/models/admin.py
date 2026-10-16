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

    # NEW — login with username OR email (migration 028 adds username).
    @staticmethod
    def find_by_username_or_email(identifier: str):
        sql = f"""
            SELECT * FROM {AdminModel.TABLE}
            WHERE (username = %s OR email = %s) AND deleted_at IS NULL
            LIMIT 1
        """
        try:
            return Database.execute(sql, (identifier, identifier), fetchone=True)
        except Exception as e:
            # admins.username missing (migration 028 not run yet) -> email only
            if "username" not in str(e).lower():
                raise
            return AdminModel.find_by_email(identifier)

    # NEW — so a citizen/beekeeper can't register an admin's username/email.
    @staticmethod
    def exists_username(username: str) -> bool:
        sql = f"SELECT 1 FROM {AdminModel.TABLE} WHERE username = %s LIMIT 1"
        try:
            return Database.execute(sql, (username,), fetchone=True) is not None
        except Exception as e:
            if "username" not in str(e).lower():
                raise
            return False

    @staticmethod
    def exists_email(email: str) -> bool:
        sql = f"SELECT 1 FROM {AdminModel.TABLE} WHERE email = %s LIMIT 1"
        return Database.execute(sql, (email,), fetchone=True) is not None

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