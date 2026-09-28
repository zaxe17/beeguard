# services/profile_service.py
#
# The logged-in citizen's / beekeeper's own profile (routes/profile.py):
#   - read it (Personal Information page)
#   - edit name, username, phone, map pin (+ farm name / apiary type
#     for beekeepers)
#   - change password
# Username and phone stay unique across BOTH citizens and beekeepers,
# the same as at registration (AuthService.check_unique).

from config.database import Database
from models.beekeeper import BeekeeperModel
from models.citizen import CitizenModel
from services.auth_service import AuthService
from services.photo_service import photo_url

_TABLE = {"citizen": "citizens", "beekeeper": "beekeepers"}
_ID_COL = {"citizen": "citizenID", "beekeeper": "beekeeperID"}
_EDITABLE = {
    "citizen": ("name", "username", "contact_no", "latitude", "longitude"),
    "beekeeper": ("name", "username", "contact_no", "latitude", "longitude",
                  "farm_name", "apiary_type"),
}


class ProfileError(Exception):
    """Validation-style problem with a field (shown under that field)."""

    def __init__(self, field: str, message: str, status: int = 409):
        super().__init__(message)
        self.field = field
        self.message = message
        self.status = status


def _row(role: str, user_id: str) -> dict | None:
    model = CitizenModel if role == "citizen" else BeekeeperModel
    row = model.find_by_id(user_id)
    if not row or row.get("deleted_at"):
        return None
    return row


def _serialize(role: str, row: dict) -> dict:
    created = row.get("created_at")
    out = {
        "id": row[_ID_COL[role]],
        "role": role,
        "name": row.get("name"),
        "username": row.get("username"),
        "email": row.get("email"),
        "contact_no": row.get("contact_no"),
        "citizenship": row.get("citizenship"),
        "latitude": float(row["latitude"]) if row.get("latitude") is not None else None,
        "longitude": float(row["longitude"]) if row.get("longitude") is not None else None,
        "created_at": created.isoformat() if hasattr(created, "isoformat") else created,
        "profile_photo": photo_url(row.get("profile_photo")),
    }
    if role == "beekeeper":
        out["farm_name"] = row.get("farm_name")
        out["apiary_type"] = row.get("apiary_type")
        out["verification_status"] = row.get("verification_status")
        out["farm_photo"] = photo_url(row.get("farm_photo"))
    return out


def _taken_by_someone_else(field: str, value: str, role: str, user_id: str) -> bool:
    """Is this username / phone used by ANY other citizen or beekeeper?"""
    for other_role, table in _TABLE.items():
        row = Database.execute(
            f"SELECT {_ID_COL[other_role]} AS id FROM {table} WHERE {field} = %s LIMIT 1",
            (value,),
            fetchone=True,
        )
        if row and not (other_role == role and row["id"] == user_id):
            return True
    return False


class ProfileService:

    @staticmethod
    def get(role: str, user_id: str) -> dict:
        row = _row(role, user_id)
        if not row:
            raise LookupError("Account not found.")
        return _serialize(role, row)

    @staticmethod
    def update(role: str, user_id: str, cleaned: dict) -> dict:
        row = _row(role, user_id)
        if not row:
            raise LookupError("Account not found.")

        changes = {
            k: v for k, v in cleaned.items()
            if k in _EDITABLE[role] and v != row.get(k)
        }
        # Compare coordinates as numbers (DB gives Decimal).
        for k in ("latitude", "longitude"):
            if k in changes and row.get(k) is not None and float(row[k]) == float(changes[k]):
                changes.pop(k)

        if "username" in changes and _taken_by_someone_else(
            "username", changes["username"], role, user_id
        ):
            raise ProfileError("username", "Username already taken.")
        if "contact_no" in changes and _taken_by_someone_else(
            "contact_no", changes["contact_no"], role, user_id
        ):
            raise ProfileError("contact_no", "This phone number is already registered.")

        if changes:
            cols = ", ".join(f"{k} = %s" for k in changes)
            Database.execute(
                f"UPDATE {_TABLE[role]} SET {cols} "
                f"WHERE {_ID_COL[role]} = %s AND deleted_at IS NULL",
                (*changes.values(), user_id),
                commit=True,
            )
        return ProfileService.get(role, user_id)

    @staticmethod
    def change_password(role: str, user_id: str, current: str, new: str) -> None:
        row = _row(role, user_id)
        if not row:
            raise LookupError("Account not found.")
        if not AuthService.verify_password(current, row["password"]):
            raise ProfileError("current_password", "Your current password is incorrect.", 400)
        Database.execute(
            f"UPDATE {_TABLE[role]} SET password = %s WHERE {_ID_COL[role]} = %s",
            (AuthService.hash_password(new), user_id),
            commit=True,
        )