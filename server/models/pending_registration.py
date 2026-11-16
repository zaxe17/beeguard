import json
import datetime as dt

from config.database import Database


class PendingRegistrationModel:
    """Holds sign-ups that have NOT verified their email yet."""

    TTL_HOURS = 24

    @staticmethod
    def upsert(email: str, role: str, payload: dict) -> None:
        """Insert, or overwrite the earlier pending sign-up for the same email."""
        expires = dt.datetime.utcnow() + dt.timedelta(
            hours=PendingRegistrationModel.TTL_HOURS
        )
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO pending_registrations
                        (email, role, payload, expires_at)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        role = VALUES(role),
                        payload = VALUES(payload),
                        created_at = CURRENT_TIMESTAMP,
                        expires_at = VALUES(expires_at)
                    """,
                    (email, role, json.dumps(payload), expires),
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def find(email: str) -> dict | None:
        """Returns {"email", "role", "payload": dict} or None (also None if expired)."""
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT email, role, payload
                    FROM pending_registrations
                    WHERE email = %s AND expires_at > UTC_TIMESTAMP()
                    """,
                    (email,),
                )
                row = cur.fetchone()
        finally:
            conn.close()

        if not row:
            return None
        if not isinstance(row, dict):
            row = {"email": row[0], "role": row[1], "payload": row[2]}
        payload = row["payload"]
        if isinstance(payload, (str, bytes)):
            payload = json.loads(payload)
        return {"email": row["email"], "role": row["role"], "payload": payload}

    @staticmethod
    def delete(email: str) -> None:
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM pending_registrations WHERE email = %s", (email,)
                )
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def purge_expired() -> None:
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM pending_registrations "
                    "WHERE expires_at <= UTC_TIMESTAMP()"
                )
            conn.commit()
        finally:
            conn.close()