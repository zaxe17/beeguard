# validators/profile_validator.py
#
# Profile → Personal Information / Change Password (routes/profile.py).
# Same rules as registration (validators/auth_validator.py) so a value
# that was valid at sign-up is still valid when edited.

import re

from validators.auth_validator import (
    ALLOWED_APIARY_TYPES,
    CONTACT_ERROR,
    _is_nonempty_str,
    _valid_password,
    normalize_ph_mobile,
)

USERNAME_RE = re.compile(r"^\S{3,30}$")  # like registration: no spaces, max 30


def validate_profile_update(role: str, payload: dict) -> tuple[dict, dict]:
    """
    Only the fields that were sent are changed. Returns (cleaned, field_errors).
    Email isn't editable here (it's tied to the verification code).
    """
    errors: dict[str, str] = {}
    cleaned: dict = {}
    if not isinstance(payload, dict) or not payload:
        return {}, {"_": "Nothing to update."}

    if "name" in payload:
        if not _is_nonempty_str(payload["name"], max_len=40):
            errors["name"] = "Full name is required (max 40 characters)."
        else:
            cleaned["name"] = payload["name"].strip()

    if "username" in payload:
        v = payload["username"]
        if not isinstance(v, str) or not USERNAME_RE.fullmatch(v.strip()):
            errors["username"] = "Username must be 3–30 characters with no spaces."
        else:
            cleaned["username"] = v.strip()

    if "contact_no" in payload:
        # Saved as the 10 digits after +63 (same as sign-up).
        mobile = normalize_ph_mobile(payload["contact_no"])
        if mobile is None:
            errors["contact_no"] = CONTACT_ERROR
        else:
            cleaned["contact_no"] = mobile

    # Location = map pin only (latitude + longitude, both or neither).
    if "latitude" in payload or "longitude" in payload:
        lat, lng = payload.get("latitude"), payload.get("longitude")
        if lat is None or lng is None:
            errors["location"] = "Please pin your location on the map."
        else:
            try:
                lat, lng = float(lat), float(lng)
                if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                    raise ValueError
                cleaned["latitude"], cleaned["longitude"] = lat, lng
            except (TypeError, ValueError):
                errors["location"] = "That location isn't valid. Pin it on the map again."

    if role == "beekeeper":
        if "farm_name" in payload:
            if not _is_nonempty_str(payload["farm_name"], max_len=20):
                errors["farm_name"] = "Farm name is required (max 20 characters)."
            else:
                cleaned["farm_name"] = payload["farm_name"].strip()
        if "apiary_type" in payload:
            if payload["apiary_type"] not in ALLOWED_APIARY_TYPES:
                errors["apiary_type"] = "Choose an apiary type: " + ", ".join(
                    sorted(ALLOWED_APIARY_TYPES)
                )
            else:
                cleaned["apiary_type"] = payload["apiary_type"]

    if not cleaned and not errors:
        errors["_"] = "Nothing to update."
    return cleaned, errors


def validate_password_change(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    if not isinstance(payload, dict):
        return {}, {"_": "Invalid request body."}

    current = payload.get("current_password")
    new = payload.get("new_password")
    confirm = payload.get("confirm_password")

    if not isinstance(current, str) or not current:
        errors["current_password"] = "Enter your current password."
    if not _valid_password(new):
        errors["new_password"] = (
            "Password must be 8–72 characters and include both letters and numbers."
        )
    elif new == current:
        errors["new_password"] = "Your new password must be different from the current one."
    if new != confirm:
        errors["confirm_password"] = "Passwords do not match."

    if errors:
        return {}, errors
    return {"current_password": current, "new_password": new}, {}