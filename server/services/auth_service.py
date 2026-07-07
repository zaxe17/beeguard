import datetime as dt
import bcrypt
import jwt

from config.config import Config
from models.citizen import CitizenModel
from models.beekeeper import BeekeeperModel
from models.admin import AdminModel
from utils.id_generator import generate_user_id


class AuthService:
    # ---------- password ----------
    @staticmethod
    def hash_password(plain: str) -> str:
        return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

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
            "exp": int((now + dt.timedelta(hours=Config.JWT_EXPIRES_HOURS)).timestamp()),
        }
        return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict:
        return jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])

    # ---------- register ----------
    @staticmethod
    def register(cleaned: dict) -> tuple[bool, str, dict | list]:
        role = cleaned["role"]
        username = cleaned["username"]
        email = cleaned["email"]

        if role == "citizen":
            if CitizenModel.exists_username(username):
                return False, "Username already taken.", ["username"]
            if CitizenModel.exists_email(email):
                return False, "Email already registered.", ["email"]

            citizen_id = generate_user_id("citizen")
            record = {
                "citizenID": citizen_id,
                "name": cleaned["name"],
                "citizenship": cleaned["citizenship"],
                "address": cleaned.get("address"),
                "latitude": cleaned.get("latitude"),
                "longitude": cleaned["longitude"],
                "username": username,
                "password": AuthService.hash_password(cleaned["password"]),
                "contact_no": cleaned["contact_no"],
                "email": email,
                "terms_accepted": cleaned["terms_accepted"],
            }
            CitizenModel.insert(record)
            return True, "Registration successful.", {
                "id": citizen_id,
                "role": "citizen",
                "username": username,
                "email": email,
            }

        # beekeeper
        if BeekeeperModel.exists_username(username):
            return False, "Username already taken.", ["username"]
        if BeekeeperModel.exists_email(email):
            return False, "Email already registered.", ["email"]

        beekeeper_id = generate_user_id("beekeeper")
        record = {
            "beekeeperID": beekeeper_id,
            "name": cleaned["name"],
            "citizenship": cleaned["citizenship"],
            "address": cleaned.get("address"),
            "latitude": cleaned.get("latitude"),
            "longitude": cleaned["longitude"],
            "username": username,
            "password": AuthService.hash_password(cleaned["password"]),
            "contact_no": cleaned["contact_no"],
            "email": email,
            "farm_name": cleaned.get("farm_name"),
            "apiary_type": cleaned["apiary_type"],
            "terms_accepted": cleaned["terms_accepted"],
        }
        BeekeeperModel.insert(record)
        return True, "Registration successful.", {
            "id": beekeeper_id,
            "role": "beekeeper",
            "username": username,
            "email": email,
        }

    # ---------- login ----------
    @staticmethod
    def login(role: str, identifier: str, password: str) -> tuple[bool, str, dict | None]:
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
