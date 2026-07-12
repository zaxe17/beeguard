from config.database import Database
from utils.id_generator import sync_next_value


class CitizenModel:
    TABLE = "citizens"

    @staticmethod
    def find_by_username_or_email(identifier: str):
        sql = f"""
            SELECT * FROM {CitizenModel.TABLE}
            WHERE (username = %s OR email = %s) AND deleted_at IS NULL
            LIMIT 1
        """
        return Database.execute(sql, (identifier, identifier), fetchone=True)

    @staticmethod
    def find_by_email(email: str):
        sql = f"""
            SELECT * FROM {CitizenModel.TABLE}
            WHERE email = %s AND deleted_at IS NULL
            LIMIT 1
        """
        return Database.execute(sql, (email,), fetchone=True)

    @staticmethod
    def exists_username(username: str) -> bool:
        sql = f"SELECT 1 FROM {CitizenModel.TABLE} WHERE username = %s LIMIT 1"
        return Database.execute(sql, (username,), fetchone=True) is not None

    @staticmethod
    def exists_email(email: str) -> bool:
        sql = f"SELECT 1 FROM {CitizenModel.TABLE} WHERE email = %s LIMIT 1"
        return Database.execute(sql, (email,), fetchone=True) is not None

    @staticmethod
    def exists_contact_no(contact_no: str) -> bool:
        sql = f"SELECT 1 FROM {CitizenModel.TABLE} WHERE contact_no = %s LIMIT 1"
        return Database.execute(sql, (contact_no,), fetchone=True) is not None

    @staticmethod
    def insert_with_conn(conn, data: dict) -> int:
        sql = f"""
            INSERT INTO {CitizenModel.TABLE}
                (citizenID, name, citizenship, address, latitude, longitude,
                 username, password, contact_no, email, terms_accepted)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            data["citizenID"],
            data["name"],
            data["citizenship"],
            data.get("address"),
            data.get("latitude"),
            data["longitude"],
            data["username"],
            data["password"],
            data["contact_no"],
            data["email"],
            data["terms_accepted"],
        )
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.rowcount

    @staticmethod
    def insert(data: dict) -> int:
        conn = Database.get_connection()
        try:
            rc = CitizenModel.insert_with_conn(conn, data)
            conn.commit()
            return rc
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def find_by_id(citizen_id: str):
        sql = f"SELECT * FROM {CitizenModel.TABLE} WHERE citizenID = %s LIMIT 1"
        return Database.execute(sql, (citizen_id,), fetchone=True)

    @staticmethod
    def mark_email_verified(email: str) -> int:
        sql = f"""
            UPDATE {CitizenModel.TABLE}
            SET email_verified = TRUE
            WHERE email = %s AND deleted_at IS NULL
        """
        return Database.execute(sql, (email,), commit=True)

    @staticmethod
    def delete(citizen_id: str) -> int:
        """
        Hard delete. Will raise an IntegrityError (foreign key
        constraint) if this citizen still has related reports or
        cv_scans referencing them with ON DELETE RESTRICT — handle
        that at the service/route layer with a friendly message,
        or remove/reassign those dependents first.
        """
        sql = f"DELETE FROM {CitizenModel.TABLE} WHERE citizenID = %s"
        result = Database.execute(sql, (citizen_id,), commit=True)
        sync_next_value("citizen")
        return result