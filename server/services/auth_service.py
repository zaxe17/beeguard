import datetime as dt

import bcrypt
import jwt
from config.config import Config
from config.database import Database
from models.admin import AdminModel
from models.beekeeper import BeekeeperModel
from models.citizen import CitizenModel
from services.otp_service import OtpService
from utils.id_generator import next_user_id


class AuthService:
    # ---------- password ----------
    @staticmethod
    def hash_password(plain: str) -> str:
        return bcrypt.hashpw(
            plain.encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False

    # ---------- JWT ----------
    @staticmethod
    def issue_token(user_id: str, role: str) -> str:
        now = dt.datetime.now(dt.timezone.utc)
        payload = {
            "sub": user_id,
            "role": role,
            "iat": int(now.timestamp()),
            "exp": int(
                (now + dt.timedelta(hours=Config.JWT_EXPIRES_HOURS)).timestamp()
            ),
        }
        return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict:
        return jwt.decode(
            token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM]
        )

    # ---------- uniqueness pre-check ----------
    @staticmethod
    def check_unique(role: str, username: str | None,
                     email: str | None, contact_no: str | None) -> dict:
        """
        Returns a dict of {field: True} for fields that ALREADY exist.
        Checks BOTH citizen and beekeeper tables so an email/phone/username
        used by one role cannot be reused by the other.
        """
        taken: dict[str, bool] = {}

        if username:
            if CitizenModel.exists_username(username) or \
               BeekeeperModel.exists_username(username):
                taken["username"] = True

        if email:
            if CitizenModel.exists_email(email) or \
               BeekeeperModel.exists_email(email):
                taken["email"] = True

        if contact_no:
            if CitizenModel.exists_contact_no(contact_no) or \
               BeekeeperModel.exists_contact_no(contact_no):
                taken["contact_no"] = True

        return taken

    # ---------- register ----------
    @staticmethod
    def register(cleaned: dict) -> tuple[bool, str, dict | list]:
        role = cleaned["role"]
        username = cleaned["username"]
        email = cleaned["email"]
        contact_no = cleaned["contact_no"]

        # Explicit uniqueness pre-check (still race-safe because of DB unique keys)
        taken = AuthService.check_unique(role, username, email, contact_no)
        if taken:
            if taken.get("email"):
                return False, "This email address is already registered.", ["email"]
            if taken.get("contact_no"):
                return False, "This phone number is already registered.", ["contact_no"]
            if taken.get("username"):
                return False, "Username already taken.", ["username"]

        hashed_pw = AuthService.hash_password(cleaned["password"])

        # ── Atomic transaction: reserve ID (per-role) + insert row ──
        conn = Database.get_connection()
        try:
            # 🔑 CHANGED: per-role sequence
            user_id = next_user_id(conn, role)

            if role == "citizen":
                record = {
                    "citizenID": user_id,
                    "name": cleaned["name"],
                    "citizenship": cleaned["citizenship"],
                    "address": cleaned.get("address"),
                    "latitude": cleaned.get("latitude"),
                    "longitude": cleaned["longitude"],
                    "username": username,
                    "password": hashed_pw,
                    "contact_no": contact_no,
                    "email": email,
                    "terms_accepted": cleaned["terms_accepted"],
                }
                CitizenModel.insert_with_conn(conn, record)
            else:
                record = {
                    "beekeeperID": user_id,
                    "name": cleaned["name"],
                    "citizenship": cleaned["citizenship"],
                    "address": cleaned.get("address"),
                    "latitude": cleaned.get("latitude"),
                    "longitude": cleaned["longitude"],
                    "username": username,
                    "password": hashed_pw,
                    "contact_no": contact_no,
                    "email": email,
                    "farm_name": cleaned["farm_name"],       # required now
                    "apiary_type": cleaned["apiary_type"],
                    "terms_accepted": cleaned["terms_accepted"],
                }
                BeekeeperModel.insert_with_conn(conn, record)

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        # Fire off verification OTP (best-effort — user can resend from UI)
        OtpService.issue_and_send(email=email, role=role, name=cleaned["name"])

        return True, "Registration successful. Verification code sent.", {
            "id": user_id,
            "role": role,
            "username": username,
            "email": email,
        }

    # ---------- verify OTP ----------
    @staticmethod
    def verify_registration_otp(email: str, role: str, code: str) -> tuple[bool, str, dict | None]:
        ok, msg = OtpService.verify(email, code)
        if not ok:
            return False, msg, None

        if role == "citizen":
            CitizenModel.mark_email_verified(email)
            row = CitizenModel.find_by_email(email)
            id_field = "citizenID"
        else:
            BeekeeperModel.mark_email_verified(email)
            row = BeekeeperModel.find_by_email(email)
            id_field = "beekeeperID"

        if not row:
            return False, "Account not found after verification.", None

        # Auto-login: issue token so user goes straight to dashboard
        user_id = row[id_field]
        token = AuthService.issue_token(user_id, role)
        return True, "Email verified. You are now logged in.", {
            "token": token,
            "user": {
                "id": user_id,
                "role": role,
                "name": row.get("name"),
                "email": row["email"],
                "username": row.get("username"),
            },
        }

    @staticmethod
    def resend_registration_otp(email: str, role: str) -> tuple[bool, str]:
        row = (CitizenModel.find_by_email(email) if role == "citizen"
               else BeekeeperModel.find_by_email(email))
        if not row:
            # Do not leak account existence
            return True, "If the account exists, a new code has been sent."
        if row.get("email_verified"):
            return False, "This account is already verified."
        return OtpService.issue_and_send(
            email=email, role=role, name=row.get("name", "")
        )

    # ---------- login ----------
    @staticmethod
    def login(role: str, identifier: str,
              password: str) -> tuple[bool, str, dict | None]:
        if role == "citizen":
            row = CitizenModel.find_by_username_or_email(identifier)
            id_field = "citizenID"
        elif role == "beekeeper":
            row = BeekeeperModel.find_by_username_or_email(identifier)
            id_field = "beekeeperID"
        elif role == "admin":
            row = AdminModel.find_by_email(identifier)
            id_field = "adminID"
        else:
            return False, "Invalid role.", None

        if not row:
            return False, "Invalid credentials.", None

        if row.get("status") and row["status"].lower() != "active":
            return False, "Account is not active.", None

        if not AuthService.verify_password(password, row["password"]):
            return False, "Invalid credentials.", None

        if role in ("citizen", "beekeeper") and not row.get("email_verified"):
            return False, "Please verify your email before logging in.", {
                "requires_verification": True,
                "email": row["email"],
                "role": role,
            }

        user_id = row[id_field]
        token = AuthService.issue_token(user_id, role)
        return True, "Login successful.", {
            "token": token,
            "user": {
                "id": user_id,
                "role": role,
                "name": row.get("name") or row.get("admin_name"),
                "email": row["email"],
                "username": row.get("username"),
            },
        }

    # ---------- fetch current user ----------
    @staticmethod
    def get_user(role: str, user_id: str) -> dict | None:
        if role == "citizen":
            row = CitizenModel.find_by_id(user_id)
            id_field = "citizenID"
        elif role == "beekeeper":
            row = BeekeeperModel.find_by_id(user_id)
            id_field = "beekeeperID"
        elif role == "admin":
            row = AdminModel.find_by_id(user_id)
            id_field = "adminID"
        else:
            return None
        if not row:
            return None
        return {
            "id": row[id_field],
            "role": role,
            "name": row.get("name") or row.get("admin_name"),
            "email": row["email"],
            "username": row.get("username"),
        }