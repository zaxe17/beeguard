# validators/chat_validator.py
import base64
import binascii
import re

MESSAGE_MAX_LEN = 2000

# Photos arrive as a base64 data URL: "data:image/jpeg;base64,....".
# The frontend shrinks them first, so real uploads are far below this.
IMAGE_MAX_BYTES = 5 * 1024 * 1024  # 5 MB after decoding
_DATA_URL_RE = re.compile(r"^data:image/(jpeg|jpg|png|webp|gif);base64,(.+)$", re.DOTALL)

# 0 = one-time pin. Anything else = live share for that many minutes.
# Must match LIVE_OPTIONS in frontend/components/ui/LocationShareModal.tsx.
LIVE_DURATIONS_MINUTES = (0, 15, 60, 480)


def validate_start_chat(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    other_id = (payload.get("other_id") or "").strip()
    if not other_id:
        errors["other_id"] = "other_id is required."
    else:
        cleaned["other_id"] = other_id

    return cleaned, errors


def validate_send_message(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    content = payload.get("content")
    if not isinstance(content, str) or not content.strip():
        errors["content"] = "Message content cannot be empty."
    elif len(content) > MESSAGE_MAX_LEN:
        errors["content"] = f"Message must be {MESSAGE_MAX_LEN} characters or fewer."
    else:
        cleaned["content"] = content.strip()

    return cleaned, errors


def validate_send_image(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    image = payload.get("image")
    if not isinstance(image, str) or not image:
        errors["image"] = "image is required."
        return cleaned, errors

    # Cheap size check before decoding (base64 is ~4/3 of the raw size).
    if len(image) > IMAGE_MAX_BYTES * 4 // 3 + 100:
        errors["image"] = "Image must be 5 MB or smaller."
        return cleaned, errors

    match = _DATA_URL_RE.match(image)
    if not match:
        errors["image"] = "Only JPG, PNG, WEBP or GIF images are allowed."
        return cleaned, errors

    try:
        data = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError):
        errors["image"] = "Image data is corrupted."
        return cleaned, errors

    if len(data) > IMAGE_MAX_BYTES:
        errors["image"] = "Image must be 5 MB or smaller."
    else:
        cleaned["image_bytes"] = data

    return cleaned, errors


def _parse_coord(payload: dict, key: str, low: float, high: float,
                 cleaned: dict, errors: dict) -> None:
    value = payload.get(key)
    # bool is a subclass of int in Python — reject it explicitly.
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        errors[key] = f"{key} is required and must be a number."
        return
    value = float(value)
    if not (low <= value <= high):
        errors[key] = f"{key} must be between {low} and {high}."
        return
    cleaned[key] = round(value, 8)


def validate_location_coords(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}
    _parse_coord(payload, "latitude", -90.0, 90.0, cleaned, errors)
    _parse_coord(payload, "longitude", -180.0, 180.0, cleaned, errors)
    return cleaned, errors


def validate_send_location(payload: dict) -> tuple[dict, dict]:
    cleaned, errors = validate_location_coords(payload)

    live_minutes = payload.get("live_minutes", 0)
    if isinstance(live_minutes, bool) or not isinstance(live_minutes, int) \
            or live_minutes not in LIVE_DURATIONS_MINUTES:
        errors["live_minutes"] = (
            "live_minutes must be one of: "
            + ", ".join(str(m) for m in LIVE_DURATIONS_MINUTES) + "."
        )
    else:
        cleaned["live_minutes"] = live_minutes

    return cleaned, errors