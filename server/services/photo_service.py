# services/photo_service.py
#
# Profile photo (citizens + beekeepers) and bee farm photo (beekeepers).
#
#   - JPG / PNG / WEBP, up to 5 MB, must really be an image (Pillow).
#   - Shrunk to max 800 px (profile) / 1600 px (farm cover) and saved as
#     JPEG, so pages load fast and phone photos don't eat disk space.
#   - Saved in server/uploads/profile/<random>.jpg, served publicly at
#     /uploads/profile/<file> (routes/profile.py). Only the file name is
#     stored in the database (Migration 019).
#   - Replacing / removing a photo deletes the old file.

import io
import os
import uuid

from config.database import Database

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_FOLDER = os.path.join(BACKEND_ROOT, "uploads", "profile")
PHOTO_URL_PREFIX = "/uploads/profile"

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_BYTES = 5 * 1024 * 1024
MAX_SIDE = {"profile": 800, "farm": 1600}

_TABLE = {"citizen": "citizens", "beekeeper": "beekeepers"}
_ID_COL = {"citizen": "citizenID", "beekeeper": "beekeeperID"}
# (role, kind) -> column
_COLUMN = {
    ("citizen", "profile"): "profile_photo",
    ("beekeeper", "profile"): "profile_photo",
    ("beekeeper", "farm"): "farm_photo",
}


def photo_url(file_name: str | None) -> str | None:
    """File name from the DB -> path the frontend loads (or None = default)."""
    return f"{PHOTO_URL_PREFIX}/{file_name}" if file_name else None


def _column(role: str, kind: str) -> str:
    col = _COLUMN.get((role, kind))
    if not col:
        raise ValueError("Only beekeepers have a farm photo." if kind == "farm"
                         else "Invalid photo type.")
    return col


def _current(role: str, user_id: str, col: str) -> str | None:
    row = Database.execute(
        f"SELECT {col} AS f FROM {_TABLE[role]} WHERE {_ID_COL[role]} = %s AND deleted_at IS NULL",
        (user_id,),
        fetchone=True,
    )
    if row is None:
        raise LookupError("Account not found.")
    return row.get("f")


def _delete_file(file_name: str | None) -> None:
    if file_name:
        try:
            os.remove(os.path.join(PHOTO_FOLDER, os.path.basename(file_name)))
        except OSError:
            pass


class PhotoService:

    @staticmethod
    def save(role: str, user_id: str, kind: str, file_storage) -> str:
        """Saves the uploaded photo and returns its URL path."""
        col = _column(role, kind)
        old = _current(role, user_id, col)

        name = (file_storage.filename or "").lower()
        ext = name.rsplit(".", 1)[-1] if "." in name else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError("Upload a JPG, PNG or WEBP image.")
        data = file_storage.read()
        if not data:
            raise ValueError("The file is empty.")
        if len(data) > MAX_BYTES:
            raise ValueError("The photo must be 5 MB or smaller.")

        from PIL import Image, ImageOps
        try:
            with Image.open(io.BytesIO(data)) as img:
                img = ImageOps.exif_transpose(img)  # phone photos: fix rotation
                img = img.convert("RGB")
                img.thumbnail((MAX_SIDE[kind], MAX_SIDE[kind]))
                out = io.BytesIO()
                img.save(out, format="JPEG", quality=85, optimize=True)
        except Exception:
            raise ValueError("That file couldn't be read as an image.")

        os.makedirs(PHOTO_FOLDER, exist_ok=True)
        file_name = f"{role[0]}{kind[0]}_{uuid.uuid4().hex}.jpg"
        with open(os.path.join(PHOTO_FOLDER, file_name), "wb") as f:
            f.write(out.getvalue())

        try:
            Database.execute(
                f"UPDATE {_TABLE[role]} SET {col} = %s WHERE {_ID_COL[role]} = %s",
                (file_name, user_id),
                commit=True,
            )
        except Exception:
            _delete_file(file_name)
            raise

        if old and old != file_name:
            _delete_file(old)
        return photo_url(file_name)

    @staticmethod
    def remove(role: str, user_id: str, kind: str) -> None:
        """Back to the default picture."""
        col = _column(role, kind)
        old = _current(role, user_id, col)
        Database.execute(
            f"UPDATE {_TABLE[role]} SET {col} = NULL WHERE {_ID_COL[role]} = %s",
            (user_id,),
            commit=True,
        )
        _delete_file(old)