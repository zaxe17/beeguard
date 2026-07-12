"""OTP model — stores hashed 6-digit codes with expiry."""
import datetime as dt

from config.database import Database


class OtpModel:
    TABLE = "otp_codes"

    @staticmethod
    def create(email: str, role: str, code_hash: str,
               expires_at: dt.datetime,
               purpose: str = "email_verification") -> int:
        # Explicitly set created_at in UTC (Python-side) instead of
        # relying on the DB's DEFAULT CURRENT_TIMESTAMP, which uses the
        # MySQL server's local timezone and would otherwise mismatch
        # against the UTC "now" used for cooldown/expiry comparisons.
        created_at = dt.datetime.utcnow()
        sql = f"""
            INSERT INTO {OtpModel.TABLE}
                (email, role, code_hash, purpose, expires_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        return Database.execute(
            sql,
            (email, role, code_hash, purpose, expires_at, created_at),
            commit=True,
        )

    @staticmethod
    def latest_active(email: str, purpose: str = "email_verification"):
        """Most recent non-consumed, non-expired OTP for the given email."""
        now = dt.datetime.utcnow()
        sql = f"""
            SELECT * FROM {OtpModel.TABLE}
            WHERE email = %s AND purpose = %s AND consumed = FALSE
              AND expires_at > %s
            ORDER BY id DESC
            LIMIT 1
        """
        return Database.execute(sql, (email, purpose, now), fetchone=True)

    @staticmethod
    def latest_any(email: str, purpose: str = "email_verification"):
        """Most recent OTP row (even expired/consumed) — for cooldown checks."""
        sql = f"""
            SELECT * FROM {OtpModel.TABLE}
            WHERE email = %s AND purpose = %s
            ORDER BY id DESC
            LIMIT 1
        """
        return Database.execute(sql, (email, purpose), fetchone=True)

    @staticmethod
    def mark_consumed(otp_id: int) -> int:
        sql = f"UPDATE {OtpModel.TABLE} SET consumed = TRUE WHERE id = %s"
        return Database.execute(sql, (otp_id,), commit=True)

    @staticmethod
    def increment_attempts(otp_id: int) -> int:
        sql = f"UPDATE {OtpModel.TABLE} SET attempts = attempts + 1 WHERE id = %s"
        return Database.execute(sql, (otp_id,), commit=True)

    @staticmethod
    def invalidate_active(email: str, purpose: str = "email_verification") -> int:
        """Consume all outstanding OTPs for an email before issuing a new one."""
        sql = f"""
            UPDATE {OtpModel.TABLE}
            SET consumed = TRUE
            WHERE email = %s AND purpose = %s AND consumed = FALSE
        """
        return Database.execute(sql, (email, purpose), commit=True)