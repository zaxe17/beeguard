import re
from email_validator import validate_email, EmailNotValidError


ALLOWED_ROLES = {"citizen", "beekeeper"}
ALLOWED_APIARY_TYPES = {"Commercial Farm", "Backyard", "Rooftop", "Wild/Forest"}


def _is_nonempty_str(v, max_len=None) -> bool:
    if not isinstance(v, str):
        return False
    v = v.strip()
    if not v:
        return False
    if max_len is not None and len(v) > max_len:
        return False
    return True


def _valid_password(pw: str) -> bool:
    return isinstance(pw, str) and 8 <= len(pw) <= 72  # bcrypt hard-limits 72 bytes


def _valid_contact(v: str) -> bool:
    return isinstance(v, str) and bool(re.fullmatch(r"[0-9+\-\s()]{7,15}", v.strip()))


def _valid_email(v: str) -> str | None:
    try:
        info = validate_email(v, check_deliverability=False)
        return info.normalized
    except EmailNotValidError:
        return None
 

def validate_register_payload(payload: dict) -> tuple[dict, list[str]]:
    """Return (cleaned_payload, errors)."""
    errors: list[str] = []
    if not isinstance(payload, dict):
        return {}, ["Invalid request body."]

    role = str(payload.get("role", "")).lower().strip()
    if role not in ALLOWED_ROLES:
        errors.append("role must be 'citizen' or 'beekeeper'.")

    # Required strings
    required = {
        "name": 40,
        "citizenship": 20,
        "username": 30,
        "contact_no": 15,
        "email": 50,
    }
    cleaned = {"role": role}
    for field, max_len in required.items():
        val = payload.get(field)
        if not _is_nonempty_str(val, max_len=max_len):
            errors.append(f"{field} is required (max {max_len} chars).")
        else:
            cleaned[field] = val.strip()

    # Email format
    if "email" in cleaned:
        norm_email = _valid_email(cleaned["email"])
        if not norm_email:
            errors.append("email is not a valid email address.")
        else:
            cleaned["email"] = norm_email

    # Contact format
    if "contact_no" in cleaned and not _valid_contact(cleaned["contact_no"]):
        errors.append("contact_no must be 7-15 chars of digits/+-() only.")

    # Password
    password = payload.get("password")
    confirm = payload.get("confirm_password")
    if not _valid_password(password):
        errors.append("password must be 8-72 characters.")
    if password != confirm:
        errors.append("password and confirm_password do not match.")
    if _valid_password(password):
        cleaned["password"] = password

    # Address (optional 100)
    address = payload.get("address")
    if address is not None:
        if not isinstance(address, str) or len(address) > 100:
            errors.append("address must be a string of max 100 chars.")
        else:
            cleaned["address"] = address.strip() or None

    # Coordinates — longitude required by schema
    lat = payload.get("latitude")
    lng = payload.get("longitude")
    try:
        cleaned["latitude"] = float(lat) if lat is not None else None
    except (TypeError, ValueError):
        errors.append("latitude must be a number.")
    try:
        if lng is None:
            errors.append("longitude is required.")
        else:
            cleaned["longitude"] = float(lng)
    except (TypeError, ValueError):
        errors.append("longitude must be a number.")

    # Terms
    terms = payload.get("terms_accepted")
    if not bool(terms):
        errors.append("terms_accepted must be true.")
    cleaned["terms_accepted"] = bool(terms)

    # Beekeeper extras
    if role == "beekeeper":
        farm_name = payload.get("farm_name")
        if farm_name is not None:
            if not isinstance(farm_name, str) or len(farm_name) > 20:
                errors.append("farm_name must be a string of max 20 chars.")
            else:
                cleaned["farm_name"] = farm_name.strip() or None

        apiary_type = payload.get("apiary_type")
        if apiary_type not in ALLOWED_APIARY_TYPES:
            errors.append(
                "apiary_type must be one of: " + ", ".join(sorted(ALLOWED_APIARY_TYPES))
            )
        else:
            cleaned["apiary_type"] = apiary_type

    return cleaned, errors


def validate_login_payload(payload: dict) -> tuple[dict, list[str]]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return {}, ["Invalid request body."]

    role = str(payload.get("role", "")).lower().strip()
    if role not in {"citizen", "beekeeper", "admin"}:
        errors.append("role must be one of citizen, beekeeper, admin.")

    identifier = payload.get("identifier") or payload.get("username") or payload.get("email")
    if not _is_nonempty_str(identifier, max_len=100):
        errors.append("identifier (username or email) is required.")

    password = payload.get("password")
    if not isinstance(password, str) or not password:
        errors.append("password is required.")

    if errors:
        return {}, errors

    return {
        "role": role,
        "identifier": identifier.strip(),
        "password": password,
    }, []
