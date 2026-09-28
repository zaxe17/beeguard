# validators/rating_validator.py
import re

COMMENT_MAX_LEN = 255


def validate_create_rating(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    offer_id = (payload.get("offer_id") or "").strip()
    if not offer_id or not re.fullmatch(r"OFR-\d{6}", offer_id):
        errors["offer_id"] = "offer_id must be a valid OFR-XXXXXX identifier."
    else:
        cleaned["offer_id"] = offer_id

    try:
        value = int(payload.get("rating_value"))
        if value < 1 or value > 5:
            raise ValueError()
        cleaned["rating_value"] = value
    except (TypeError, ValueError):
        errors["rating_value"] = "rating_value must be an integer from 1 to 5."

    comment = payload.get("comment")
    if comment is not None:
        if not isinstance(comment, str) or len(comment) > COMMENT_MAX_LEN:
            errors["comment"] = f"comment must be {COMMENT_MAX_LEN} characters or fewer."
        else:
            cleaned["comment"] = comment.strip() or None
    else:
        cleaned["comment"] = None

    return cleaned, errors
