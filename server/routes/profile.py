# routes/profile.py
#
# The logged-in citizen's / beekeeper's own profile.
#   GET   /api/profile            -> my details
#   PATCH /api/profile            {name?, username?, contact_no?, latitude?, longitude?,
#                                  farm_name?, apiary_type?  (beekeeper)}
#   POST  /api/profile/password   {current_password, new_password, confirm_password}
#   POST  /api/profile/photo?type=profile|farm   (multipart: "photo")
#   DELETE /api/profile/photo?type=profile|farm  -> back to the default picture
#   GET   /uploads/profile/<file>                -> the photo itself (public)
#
# Errors come back like registration's: {message, errors, field_errors}
# so each message can be shown under its own field.

import pymysql
from flask import Blueprint, request, g, send_from_directory

from middleware.auth_middleware import token_required, role_required
from services.profile_service import ProfileError, ProfileService
from services.photo_service import PHOTO_FOLDER, PhotoService
from utils.responses import success, error
from validators.profile_validator import validate_password_change, validate_profile_update


profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")
# Photos are public images (shown on farm pages, chats, reports).
profile_photos_bp = Blueprint("profile_photos", __name__)


@profile_photos_bp.route("/uploads/profile/<path:filename>", methods=["GET"])
def serve_profile_photo(filename):
    return send_from_directory(PHOTO_FOLDER, filename, max_age=7 * 24 * 3600)


def _field_error(message: str, field_errors: dict, status: int):
    resp, code = error(
        message,
        errors=[f"{k}: {v}" if k != "_" else v for k, v in field_errors.items()],
        status=status,
    )
    body = resp.get_json()
    body["field_errors"] = field_errors
    return body, code


@profile_bp.route("", methods=["GET"])
@token_required
@role_required("citizen", "beekeeper")
def get_profile():
    try:
        return success("OK", data=ProfileService.get(g.role, g.user_id))
    except LookupError as e:
        return error(str(e), status=404)


@profile_bp.route("", methods=["PATCH"])
@token_required
@role_required("citizen", "beekeeper")
def update_profile():
    cleaned, field_errors = validate_profile_update(g.role, request.get_json(silent=True) or {})
    if field_errors:
        return _field_error("Please check the highlighted fields.", field_errors, 422)
    try:
        data = ProfileService.update(g.role, g.user_id, cleaned)
    except ProfileError as e:
        return _field_error(e.message, {e.field: e.message}, e.status)
    except LookupError as e:
        return error(str(e), status=404)
    except pymysql.err.IntegrityError as e:
        msg = str(e).lower()
        field = "username" if "username" in msg else "contact_no" if "contact" in msg else "_"
        return _field_error("That value is already in use.", {field: "Already in use."}, 409)
    except Exception as e:
        print(f"[PROFILE-UPDATE] Unhandled error: {e}")
        return error("Couldn't save your profile. Please try again.", status=500)
    return success("Profile saved.", data=data)


@profile_bp.route("/password", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def change_password():
    cleaned, field_errors = validate_password_change(request.get_json(silent=True) or {})
    if field_errors:
        return _field_error("Please check the highlighted fields.", field_errors, 422)
    try:
        ProfileService.change_password(
            g.role, g.user_id, cleaned["current_password"], cleaned["new_password"]
        )
    except ProfileError as e:
        return _field_error(e.message, {e.field: e.message}, e.status)
    except LookupError as e:
        return error(str(e), status=404)
    except Exception as e:
        print(f"[PROFILE-PASSWORD] Unhandled error: {e}")
        return error("Couldn't change your password. Please try again.", status=500)
    return success("Password updated.")


# ── PROFILE / FARM PHOTO ──────────────────────
@profile_bp.route("/photo", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def upload_photo():
    kind = (request.args.get("type") or "profile").lower()
    file = request.files.get("photo")
    if not file:
        return error("Choose a photo to upload.", status=422)
    try:
        url = PhotoService.save(g.role, g.user_id, kind, file)
    except ValueError as e:
        return error(str(e), status=422)
    except LookupError as e:
        return error(str(e), status=404)
    except Exception as e:
        print(f"[PROFILE-PHOTO] Unhandled error: {e}")
        return error("Couldn't save the photo. Please try again.", status=500)
    label = "Farm photo" if kind == "farm" else "Profile photo"
    return success(f"{label} updated.", data={"type": kind, "url": url})


@profile_bp.route("/photo", methods=["DELETE"])
@token_required
@role_required("citizen", "beekeeper")
def remove_photo():
    kind = (request.args.get("type") or "profile").lower()
    try:
        PhotoService.remove(g.role, g.user_id, kind)
    except ValueError as e:
        return error(str(e), status=422)
    except LookupError as e:
        return error(str(e), status=404)
    return success("Photo removed.", data={"type": kind, "url": None})