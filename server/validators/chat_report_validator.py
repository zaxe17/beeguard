# validators/chat_report_validator.py

CATEGORY_MAX_LEN = 50
DETAILS_MAX_LEN = 255


def validate_create_chat_report(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    try:
        chat_id = int(payload.get("chat_id"))
        cleaned["chat_id"] = chat_id
    except (TypeError, ValueError):
        errors["chat_id"] = "chat_id is required and must be an integer."

    category = payload.get("category")
    if not isinstance(category, str) or not category.strip():
        errors["category"] = "category is required."
    elif len(category) > CATEGORY_MAX_LEN:
        errors["category"] = f"category must be {CATEGORY_MAX_LEN} characters or fewer."
    else:
        cleaned["category"] = category.strip()

    details = payload.get("details")
    if details is not None:
        if not isinstance(details, str) or len(details) > DETAILS_MAX_LEN:
            errors["details"] = f"details must be {DETAILS_MAX_LEN} characters or fewer."
        else:
            cleaned["details"] = details.strip() or None
    else:
        cleaned["details"] = None

    return cleaned, errors
