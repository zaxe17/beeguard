import datetime as dt
import hashlib

import bcrypt
import jwt
from config.config import Config
from config.database import Database
from models.admin import AdminModel
from models.beekeeper import BeekeeperModel
from models.citizen import CitizenModel
from models.pending_registration import PendingRegistrationModel  # NEW
from services.otp_service import OtpService
from utils.id_generator import next_user_id
from utils.logger import audit


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
    def issue_token(user_id: str, role: str, remember: bool = False) -> str:
        now = dt.datetime.now(dt.timezone.utc)
        hours = (
            Config.JWT_EXPIRES_HOURS_REMEMBER if remember
            else Config.JWT_EXPIRES_HOURS
        )
        payload = {
            "sub": user_id,
            "role": role,
            "iat": int(now.timestamp()),
            "exp": int((now + dt.timedelta(hours=hours)).timestamp()),
            "rmb": bool(remember),
        }
        return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict:
        return jwt.decode(
            token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM]
        )

    # ---------- uniqueness pre-check ----------
    # Only checks REAL accounts. Pending (unverified) sign-ups live in
    # pending_registrations and never block anyone.
    @staticmethod
    def check_unique(role: str, username: str | None,
                     email: str | None, contact_no: str | None) -> dict:
        taken: dict[str, bool] = {}
        if username:
            if CitizenModel.exists_username(username) or \
               BeekeeperModel.exists_username(username) or \
               AdminModel.exists_username(username):
                taken["username"] = True
        if email:
            if CitizenModel.exists_email(email) or \
               BeekeeperModel.exists_email(email) or \
               AdminModel.exists_email(email):
                taken["email"] = True
        if contact_no:
            if CitizenModel.exists_contact_no(contact_no) or \
               BeekeeperModel.exists_contact_no(contact_no):
                taken["contact_no"] = True
        return taken

    # NEW
    @staticmethod
    def _taken_message(taken: dict) -> tuple[str, list]:
        if taken.get("email"):
            return "This email address is already registered.", ["email"]
        if taken.get("contact_no"):
            return "This phone number is already registered.", ["contact_no"]
        return "Username already taken.", ["username"]

    # ---------- register ----------
    # CHANGED: NOTHING is written to citizens/beekeepers here anymore.
    # The sign-up is parked in pending_registrations (password already
    # hashed) and only becomes a real account after the OTP is verified.
    @staticmethod
    def register(cleaned: dict) -> tuple[bool, str, dict | list]:
        role = cleaned["role"]
        username = cleaned["username"]
        email = cleaned["email"]
        contact_no = cleaned["contact_no"]

        taken = AuthService.check_unique(role, username, email, contact_no)
        if taken:
            msg, fields = AuthService._taken_message(taken)
            return False, msg, fields

        # Housekeeping: drop sign-ups nobody finished.
        PendingRegistrationModel.purge_expired()

        # Never store the plain password, not even in the pending table.
        pending_payload = dict(cleaned)
        pending_payload["password"] = AuthService.hash_password(cleaned["password"])

        # Same email signing up again (user left the verification page and
        # came back) simply overwrites the old pending row.
        PendingRegistrationModel.upsert(email, role, pending_payload)

        OtpService.issue_and_send(email=email, role=role, name=cleaned["name"])

        return True, "Verification code sent.", {
            "id": None,  # no ID yet; it's assigned after verification
            "role": role, "username": username, "email": email,
        }

    # ---------- verify OTP (auto-login WITHOUT remember-me) ----------
    # CHANGED: the real account is created here, after the code is correct.
    @staticmethod
    def verify_registration_otp(email: str, role: str, code: str) -> tuple[bool, str, dict | None]:
        ok, msg = OtpService.verify(email, code)
        if not ok:
            return False, msg, None

        pending = PendingRegistrationModel.find(email)

        if pending:
            if pending["role"] != role:
                return False, "Registration not found. Please sign up again.", None

            data = pending["payload"]

            # Re-check: someone else may have taken the username/phone
            # while this sign-up was waiting for verification.
            taken = AuthService.check_unique(
                role, data["username"], data["email"], data["contact_no"]
            )
            if taken:
                PendingRegistrationModel.delete(email)
                tmsg, _ = AuthService._taken_message(taken)
                return False, tmsg + " Please sign up again.", None

            conn = Database.get_connection()
            try:
                user_id = next_user_id(conn, role)
                base = {
                    "name": data["name"],
                    "citizenship": data["citizenship"],
                    "address": data.get("address"),
                    "latitude": data.get("latitude"),
                    "longitude": data["longitude"],
                    "username": data["username"],
                    "password": data["password"],   # already bcrypt-hashed
                    "contact_no": data["contact_no"],
                    "email": data["email"],
                    "terms_accepted": data["terms_accepted"],
                }
                if role == "citizen":
                    CitizenModel.insert_with_conn(
                        conn, {"citizenID": user_id, **base}
                    )
                else:
                    BeekeeperModel.insert_with_conn(
                        conn,
                        {
                            "beekeeperID": user_id,
                            **base,
                            "farm_name": data["farm_name"],
                            "apiary_type": data["apiary_type"],
                        },
                    )
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

            if role == "citizen":
                CitizenModel.mark_email_verified(email)
            else:
                BeekeeperModel.mark_email_verified(email)
            PendingRegistrationModel.delete(email)
        else:
            # Legacy path: accounts created BEFORE this fix that are
            # sitting in the real table as unverified.
            if role == "citizen":
                CitizenModel.mark_email_verified(email)
            else:
                BeekeeperModel.mark_email_verified(email)

        row = (CitizenModel.find_by_email(email) if role == "citizen"
               else BeekeeperModel.find_by_email(email))
        id_field = "citizenID" if role == "citizen" else "beekeeperID"

        if not row:
            return False, "Account not found after verification.", None

        user_id = row[id_field]
        token = AuthService.issue_token(user_id, role, remember=False)
        return True, "Email verified. You are now logged in.", {
            "token": token,
            "user": {
                "id": user_id, "role": role,
                "name": row.get("name"),
                "email": row["email"],
                "username": row.get("username"),
            },
        }

    # CHANGED: resend looks at pending sign-ups first.
    @staticmethod
    def resend_registration_otp(email: str, role: str) -> tuple[bool, str]:
        pending = PendingRegistrationModel.find(email)
        if pending and pending["role"] == role:
            return OtpService.issue_and_send(
                email=email, role=role,
                name=pending["payload"].get("name", ""),
            )

        # Legacy accounts (already in the real table, unverified)
        row = (CitizenModel.find_by_email(email) if role == "citizen"
               else BeekeeperModel.find_by_email(email))
        if not row:
            return True, "If the account exists, a new code has been sent."
        if row.get("email_verified"):
            return False, "This account is already verified."
        return OtpService.issue_and_send(
            email=email, role=role, name=row.get("name", "")
        )

    # ---------- forgot password (unchanged) ----------
    RESET_TOKEN_MINUTES = 15
    _RESET_KEY_SUFFIX = ":password_reset"

    @staticmethod
    def _reset_key() -> str:
        return Config.JWT_SECRET + AuthService._RESET_KEY_SUFFIX

    @staticmethod
    def _password_fingerprint(hashed_password: str) -> str:
        return hashlib.sha256(
            (hashed_password or "").encode("utf-8")
        ).hexdigest()[:16]

    @staticmethod
    def _find_account_by_email(email: str):
        row = CitizenModel.find_by_email(email)
        if row:
            return "citizen", row
        row = BeekeeperModel.find_by_email(email)
        if row:
            return "beekeeper", row
        row = AdminModel.find_by_email(email)
        if row:
            return "admin", row
        return None, None

    @staticmethod
    def request_password_reset(email: str) -> tuple[bool, str]:
        generic = "If an account uses that email, a reset code has been sent."
        role, row = AuthService._find_account_by_email(email)
        if not row:
            return True, generic
        if row.get("status") and str(row["status"]).lower() != "active":
            return True, generic

        ok, msg = OtpService.issue_and_send(
            email=email,
            role=role,
            name=row.get("name") or row.get("admin_name") or "",
            purpose=OtpService.PURPOSE_PASSWORD_RESET,
        )
        if not ok:
            return False, msg
        return True, generic

    @staticmethod
    def verify_password_reset_code(email: str, code: str) -> tuple[bool, str, dict | None]:
        role, row = AuthService._find_account_by_email(email)
        if not row:
            return False, "Reset code expired or not found. Please request a new one.", None

        ok, msg = OtpService.verify(
            email, code, purpose=OtpService.PURPOSE_PASSWORD_RESET
        )
        if not ok:
            return False, msg, None

        now = dt.datetime.now(dt.timezone.utc)
        payload = {
            "sub": email,
            "role": role,
            "pur": "password_reset",
            "pwf": AuthService._password_fingerprint(row.get("password")),
            "iat": int(now.timestamp()),
            "exp": int((now + dt.timedelta(
                minutes=AuthService.RESET_TOKEN_MINUTES)).timestamp()),
        }
        token = jwt.encode(payload, AuthService._reset_key(),
                           algorithm=Config.JWT_ALGORITHM)
        return True, "Code verified. You can now set a new password.", {
            "reset_token": token,
            "expires_in_minutes": AuthService.RESET_TOKEN_MINUTES,
        }

    @staticmethod
    def reset_password(reset_token: str, new_password: str) -> tuple[bool, str]:
        expired_msg = "Your reset session expired. Please request a new code."
        try:
            payload = jwt.decode(
                reset_token, AuthService._reset_key(),
                algorithms=[Config.JWT_ALGORITHM],
            )
        except jwt.ExpiredSignatureError:
            return False, expired_msg
        except jwt.InvalidTokenError:
            return False, "Invalid reset session. Please start again."

        if payload.get("pur") != "password_reset":
            return False, "Invalid reset session. Please start again."

        email = payload.get("sub")
        role, row = AuthService._find_account_by_email(email or "")
        if not row or role != payload.get("role"):
            return False, "Account not found."

        if AuthService._password_fingerprint(row.get("password")) != payload.get("pwf"):
            return False, "This reset was already used. Please request a new code."

        if AuthService.verify_password(new_password, row.get("password") or ""):
            return False, "New password must be different from your old password."

        hashed = AuthService.hash_password(new_password)
        audit("PASSWORD_CHANGED_BY_RESET", email=email, role=role)
        if role == "citizen":
            CitizenModel.update_password_by_email(email, hashed)
        elif role == "beekeeper":
            BeekeeperModel.update_password_by_email(email, hashed)
        else:
            AdminModel.update_password_by_email(email, hashed)

        return True, "Password updated. You can now sign in with your new password."

    # ---------- role auto-detection (unchanged) ----------
    @staticmethod
    def _find_account_by_identifier(identifier: str):
        row = CitizenModel.find_by_username_or_email(identifier)
        if row:
            return "citizen", "citizenID", row

        row = BeekeeperModel.find_by_username_or_email(identifier)
        if row:
            return "beekeeper", "beekeeperID", row

        row = AdminModel.find_by_username_or_email(identifier)
        if row:
            return "admin", "adminID", row

        return None, None, None

    # ---------- login (unchanged) ----------
    @staticmethod
    def login(role: str | None, identifier: str, password: str,
              remember: bool = False) -> tuple[bool, str, dict | None]:
        if role:
            if role == "citizen":
                row = CitizenModel.find_by_username_or_email(identifier)
                id_field = "citizenID"
            elif role == "beekeeper":
                row = BeekeeperModel.find_by_username_or_email(identifier)
                id_field = "beekeeperID"
            elif role == "admin":
                row = AdminModel.find_by_username_or_email(identifier)
                id_field = "adminID"
            else:
                return False, "Invalid role.", None
        else:
            role, id_field, row = AuthService._find_account_by_identifier(identifier)

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
        token = AuthService.issue_token(user_id, role, remember=remember)
        return True, "Login successful.", {
            "token": token,
            "user": {
                "id": user_id, "role": role,
                "name": row.get("name") or row.get("admin_name"),
                "email": row["email"],
                "username": row.get("username"),
            },
        }

    # ---------- fetch current user (unchanged) ----------
    @staticmethod
    def get_user(role: str, user_id: str) -> dict | None:
        if role == "citizen":
            row = CitizenModel.find_by_id(user_id); id_field = "citizenID"
        elif role == "beekeeper":
            row = BeekeeperModel.find_by_id(user_id); id_field = "beekeeperID"
        elif role == "admin":
            row = AdminModel.find_by_id(user_id); id_field = "adminID"
        else:
            return None
        if not row:
            return None
        user = {
            "id": row[id_field], "role": role,
            "name": row.get("name") or row.get("admin_name"),
            "email": row["email"], "username": row.get("username"),
        }
        if role in ("citizen", "beekeeper"):
            lat = row.get("latitude")
            lng = row.get("longitude")
            user["latitude"] = float(lat) if lat is not None else None
            user["longitude"] = float(lng) if lng is not None else None
            photo = row.get("profile_photo")
            user["profile_photo"] = f"/uploads/profile/{photo}" if photo else None
        if role == "beekeeper":
            user["verification_status"] = row.get("verification_status")
        return user