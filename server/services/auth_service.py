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
    def issue_token(user_id: str, role: str, remember: bool = False) -> str:
        """
        Standard session: Config.JWT_EXPIRES_HOURS (default 24h).
        Remember Me:      Config.JWT_EXPIRES_HOURS_REMEMBER (default 30d).

        Note: the JWT itself carries the extended expiry — no separate
        refresh-token endpoint is introduced, which keeps the middleware
        (`token_required`) unchanged. If you later need true refresh-token
        rotation, add a `refresh_tokens` table + `/auth/refresh` route;
        the `remember` flag here already flows through cleanly.
        """
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
            "rmb": bool(remember),   # informational; middleware ignores
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

    # ---------- register (unchanged) ----------
    @staticmethod
    def register(cleaned: dict) -> tuple[bool, str, dict | list]:
        role = cleaned["role"]
        username = cleaned["username"]
        email = cleaned["email"]
        contact_no = cleaned["contact_no"]

        taken = AuthService.check_unique(role, username, email, contact_no)
        if taken:
            if taken.get("email"):
                return False, "This email address is already registered.", ["email"]
            if taken.get("contact_no"):
                return False, "This phone number is already registered.", ["contact_no"]
            if taken.get("username"):
                return False, "Username already taken.", ["username"]

        hashed_pw = AuthService.hash_password(cleaned["password"])

        conn = Database.get_connection()
        try:
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
                    "farm_name": cleaned["farm_name"],
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

        OtpService.issue_and_send(email=email, role=role, name=cleaned["name"])

        return True, "Registration successful. Verification code sent.", {
            "id": user_id, "role": role, "username": username, "email": email,
        }

    # ---------- verify OTP (auto-login WITHOUT remember-me) ----------
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

        user_id = row[id_field]
        # Auto-login after verify uses the STANDARD session — the user
        # never got the chance to tick "Remember me" on the OTP screen.
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

    @staticmethod
    def resend_registration_otp(email: str, role: str) -> tuple[bool, str]:
        row = (CitizenModel.find_by_email(email) if role == "citizen"
               else BeekeeperModel.find_by_email(email))
        if not row:
            return True, "If the account exists, a new code has been sent."
        if row.get("email_verified"):
            return False, "This account is already verified."
        return OtpService.issue_and_send(
            email=email, role=role, name=row.get("name", "")
        )

    # ---------- role auto-detection ----------
    @staticmethod
    def _find_account_by_identifier(identifier: str):
        """
        Look up `identifier` (username or email) across all three role
        tables, in order: citizen -> beekeeper -> admin. Returns the
        first match as (role, id_field, row), or (None, None, None) if
        no account exists under any role.

        This relies on username/email being enforced unique ACROSS the
        citizen and beekeeper tables already (see AuthService.check_unique,
        used at registration time), so a given identifier should only
        ever belong to one account. Admin accounts are looked up by
        email only, matching the existing admin lookup elsewhere in
        this service.
        """
        row = CitizenModel.find_by_username_or_email(identifier)
        if row:
            return "citizen", "citizenID", row

        row = BeekeeperModel.find_by_username_or_email(identifier)
        if row:
            return "beekeeper", "beekeeperID", row

        row = AdminModel.find_by_email(identifier)
        if row:
            return "admin", "adminID", row

        return None, None, None

    # ---------- login (role optional — auto-detected if omitted) ----------
    @staticmethod
    def login(role: str | None, identifier: str, password: str,
              remember: bool = False) -> tuple[bool, str, dict | None]:
        if role:
            # Explicit role given — look up only in that table.
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
        else:
            # No role given — auto-detect by searching all role tables.
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

    # ---------- fetch current user ----------
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
        # NEW — citizens and beekeepers may have a stored farm/home pin.
        # Exposed here so the frontend (e.g. the Add Alert map) can
        # auto-center on the user's own location instead of always
        # defaulting to a fixed spot in Quezon City. `None` when the
        # user never set a location (or only partially set it) —
        # the frontend should fall back to its own default in that case.
        if role in ("citizen", "beekeeper"):
            lat = row.get("latitude")
            lng = row.get("longitude")
            user["latitude"] = float(lat) if lat is not None else None
            user["longitude"] = float(lng) if lng is not None else None
        return user