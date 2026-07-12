"""OTP generation, verification, resend cooldown."""
import datetime as dt
import hashlib
import hmac
import secrets

from config.config import Config
from models.otp import OtpModel
from services.email_service import EmailService


class OtpService:
    PURPOSE = "email_verification"

    # ---- helpers ----
    @staticmethod
    def _hash(code: str) -> str:
        # HMAC-SHA256 with JWT_SECRET as key — server-side pepper
        return hmac.new(
            Config.JWT_SECRET.encode("utf-8"),
            code.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def _generate_code() -> str:
        # Cryptographically secure 6-digit code (zero-padded)
        return f"{secrets.randbelow(1_000_000):06d}"

    # ---- issue ----
    @staticmethod
    def issue_and_send(email: str, role: str, name: str = "") -> tuple[bool, str]:
        """
        Consumes any outstanding OTPs, generates a new one, persists its
        hash, and emails the plaintext code. Returns (ok, message).
        """
        # Resend cooldown check
        latest = OtpModel.latest_any(email, OtpService.PURPOSE)
        if latest and latest.get("created_at"):
            now = dt.datetime.utcnow()
            created = latest["created_at"]
            if isinstance(created, dt.datetime):
                elapsed = (now - created).total_seconds()
                if elapsed < Config.OTP_RESEND_COOLDOWN_SECONDS:
                    remaining = int(Config.OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                    return False, (
                        f"Please wait {remaining} seconds before requesting a new code."
                    )

        OtpModel.invalidate_active(email, OtpService.PURPOSE)

        code = OtpService._generate_code()
        code_hash = OtpService._hash(code)
        expires_at = dt.datetime.utcnow() + dt.timedelta(
            minutes=Config.OTP_TTL_MINUTES
        )

        OtpModel.create(email, role, code_hash, expires_at, OtpService.PURPOSE)

        try:
            EmailService.send_verification_otp(
                to_email=email,
                name=name,
                code=code,
                ttl_minutes=Config.OTP_TTL_MINUTES,
            )
        except Exception as e:
            # We deliberately do NOT reveal SMTP errors to the client.
            print(f"[OTP] Failed to send email to {email}: {e}")
            return False, "Failed to send verification email. Please try again later."

        return True, "Verification code sent."

    # ---- verify ----
    @staticmethod
    def verify(email: str, code: str) -> tuple[bool, str]:
        record = OtpModel.latest_active(email, OtpService.PURPOSE)
        if not record:
            return False, "Verification code expired or not found. Please request a new one."

        if record["attempts"] >= Config.OTP_MAX_ATTEMPTS:
            OtpModel.mark_consumed(record["id"])
            return False, "Too many attempts. Please request a new code."

        if not hmac.compare_digest(record["code_hash"], OtpService._hash(code)):
            OtpModel.increment_attempts(record["id"])
            remaining = Config.OTP_MAX_ATTEMPTS - (record["attempts"] + 1)
            if remaining <= 0:
                OtpModel.mark_consumed(record["id"])
                return False, "Too many attempts. Please request a new code."
            return False, f"Incorrect code. {remaining} attempt(s) remaining."

        OtpModel.mark_consumed(record["id"])
        return True, "Verified."
