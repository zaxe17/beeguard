from config.database import Database
from utils.id_generator import sync_next_value


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
    def find_by_email(email: str):
        sql = f"""
            SELECT * FROM {BeekeeperModel.TABLE}
            WHERE email = %s AND deleted_at IS NULL
            LIMIT 1
        """
        return Database.execute(sql, (email,), fetchone=True)

    @staticmethod
    def exists_username(username: str) -> bool:
        sql = f"SELECT 1 FROM {BeekeeperModel.TABLE} WHERE username = %s LIMIT 1"
        return Database.execute(sql, (username,), fetchone=True) is not None

    @staticmethod
    def exists_email(email: str) -> bool:
        sql = f"SELECT 1 FROM {BeekeeperModel.TABLE} WHERE email = %s LIMIT 1"
        return Database.execute(sql, (email,), fetchone=True) is not None

    @staticmethod
    def exists_contact_no(contact_no: str) -> bool:
        sql = f"SELECT 1 FROM {BeekeeperModel.TABLE} WHERE contact_no = %s LIMIT 1"
        return Database.execute(sql, (contact_no,), fetchone=True) is not None

    @staticmethod
    def insert_with_conn(conn, data: dict) -> int:
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
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.rowcount

    @staticmethod
    def insert(data: dict) -> int:
        conn = Database.get_connection()
        try:
            rc = BeekeeperModel.insert_with_conn(conn, data)
            conn.commit()
            return rc
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def find_by_id(beekeeper_id: str):
        sql = f"SELECT * FROM {BeekeeperModel.TABLE} WHERE beekeeperID = %s LIMIT 1"
        return Database.execute(sql, (beekeeper_id,), fetchone=True)

    @staticmethod
    def update_location(beekeeper_id: str, latitude: float, longitude: float) -> int:
        """
        NEW — previously there was no way to set/fix a beekeeper's
        location after registration. `latitude` was optional at
        signup while `longitude` was required, so a beekeeper who
        registered without dropping a map pin ends up with
        latitude = NULL forever. That silently excludes them from
        PesticideService._find_nearby_beekeepers (which requires both
        latitude AND longitude to be non-null), so they never get
        matched into alert_recipients for ANY alert — the alert still
        shows up on the general "active alerts" list, just never on
        their personal "mine"/dashboard feed.

        NOTE: this does not retroactively backfill alert_recipients
        for alerts already created before the location was fixed —
        matching only runs once, at alert-creation time. A beekeeper
        who fixes their location will start showing up starting with
        the next alert created, not past ones.
        """
        sql = f"""
            UPDATE {BeekeeperModel.TABLE}
            SET latitude = %s, longitude = %s
            WHERE beekeeperID = %s AND deleted_at IS NULL
        """
        return Database.execute(
            sql, (latitude, longitude, beekeeper_id), commit=True
        )

    @staticmethod
    def mark_email_verified(email: str) -> int:
        sql = f"""
            UPDATE {BeekeeperModel.TABLE}
            SET email_verified = TRUE
            WHERE email = %s AND deleted_at IS NULL
        """
        return Database.execute(sql, (email,), commit=True)

    @staticmethod
    def delete(beekeeper_id: str) -> int:
        """
        Hard delete. Will raise an IntegrityError (foreign key
        constraint) if this beekeeper still has related hives,
        alerts, or rescue_offers referencing them with ON DELETE
        RESTRICT — handle that at the service/route layer with a
        friendly message, or remove/reassign those dependents first.
        """
        sql = f"DELETE FROM {BeekeeperModel.TABLE} WHERE beekeeperID = %s"
        result = Database.execute(sql, (beekeeper_id,), commit=True)
        sync_next_value("beekeeper")
        return result