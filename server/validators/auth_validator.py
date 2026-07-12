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
    if not isinstance(pw, str) or not (8 <= len(pw) <= 72):
        return False
    # At least one letter and one digit — reasonable strength floor
    return bool(re.search(r"[A-Za-z]", pw)) and bool(re.search(r"\d", pw))


def _valid_contact(v: str) -> bool:
    return isinstance(v, str) and bool(re.fullmatch(r"[0-9+\-\s()]{7,15}", v.strip()))


def _valid_email(v: str) -> str | None:
    try:
        info = validate_email(v, check_deliverability=False)
        return info.normalized
    except EmailNotValidError:
        return None


def validate_register_payload(payload: dict) -> tuple[dict, dict]:
    """
    Return (cleaned_payload, field_errors).
    field_errors is a dict {field_name: message}; empty dict means OK.
    """
    field_errors: dict[str, str] = {}
    if not isinstance(payload, dict):
        return {}, {"_": "Invalid request body."}

    role = str(payload.get("role", "")).lower().strip()
    if role not in ALLOWED_ROLES:
        field_errors["role"] = "Role must be 'citizen' or 'beekeeper'."

    cleaned: dict = {"role": role}

    # Required strings with max-len
    required = {
        "name":        (40, "Full name is required."),
        "citizenship": (20, "Citizenship is required."),
        "username":    (30, "Username is required."),
        "contact_no":  (15, "Contact number is required."),
        "email":       (50, "Email address is required."),
    }
    for field, (max_len, msg) in required.items():
        val = payload.get(field)
        if not _is_nonempty_str(val, max_len=max_len):
            field_errors[field] = msg
        else:
            cleaned[field] = val.strip()

    # Email format
    if "email" in cleaned:
        norm_email = _valid_email(cleaned["email"])
        if not norm_email:
            field_errors["email"] = "Please enter a valid email address."
        else:
            cleaned["email"] = norm_email

    # Contact format
    if "contact_no" in cleaned and not _valid_contact(cleaned["contact_no"]):
        field_errors["contact_no"] = (
            "Phone must be 7–15 characters (digits, +, -, spaces, or parentheses)."
        )

    # Password
    password = payload.get("password")
    confirm = payload.get("confirm_password")
    if not _valid_password(password):
        field_errors["password"] = (
            "Password must be 8–72 chars and include both letters and numbers."
        )
    if password != confirm:
        field_errors["confirm_password"] = "Passwords do not match."
    if _valid_password(password) and password == confirm:
        cleaned["password"] = password

    # Address (optional, max 100)
    address = payload.get("address")
    if address is not None:
        if not isinstance(address, str) or len(address) > 100:
            field_errors["address"] = "Address must be 100 characters or fewer."
        else:
            cleaned["address"] = address.strip() or None

    # Coordinates — longitude required by schema
    lat = payload.get("latitude")
    lng = payload.get("longitude")
    try:
        cleaned["latitude"] = float(lat) if lat is not None else None
    except (TypeError, ValueError):
        field_errors["latitude"] = "Latitude must be a number."
    try:
        if lng is None:
            field_errors["longitude"] = "Longitude is required."
        else:
            cleaned["longitude"] = float(lng)
    except (TypeError, ValueError):
        field_errors["longitude"] = "Longitude must be a number."

    # Terms
    if not bool(payload.get("terms_accepted")):
        field_errors["terms_accepted"] = "You must accept the Terms & Conditions."
    cleaned["terms_accepted"] = bool(payload.get("terms_accepted"))

    # Beekeeper extras
    if role == "beekeeper":
        farm_name = payload.get("farm_name")
        if not _is_nonempty_str(farm_name, max_len=20):
            field_errors["farm_name"] = "Farm name is required (max 20 chars)."
        else:
            cleaned["farm_name"] = farm_name.strip()

        apiary_type = payload.get("apiary_type")
        if apiary_type not in ALLOWED_APIARY_TYPES:
            field_errors["apiary_type"] = (
                "Choose an apiary type: "
                + ", ".join(sorted(ALLOWED_APIARY_TYPES))
            )
        else:
            cleaned["apiary_type"] = apiary_type

    return cleaned, field_errors


def validate_login_payload(payload: dict) -> tuple[dict, dict]:
    field_errors: dict[str, str] = {}
    if not isinstance(payload, dict):
        return {}, {"_": "Invalid request body."}

    role = str(payload.get("role", "")).lower().strip()
    if role not in {"citizen", "beekeeper", "admin"}:
        field_errors["role"] = "Role must be citizen, beekeeper, or admin."

    identifier = (
        payload.get("identifier")
        or payload.get("username")
        or payload.get("email")
    )
    if not _is_nonempty_str(identifier, max_len=100):
        field_errors["identifier"] = "Username or email is required."

    password = payload.get("password")
    if not isinstance(password, str) or not password:
        field_errors["password"] = "Password is required."

    if field_errors:
        return {}, field_errors

    return {
        "role": role,
        "identifier": identifier.strip(),
        "password": password,
    }, {}


# ─────────────────────────────────────────────────────────
# NEW: uniqueness pre-check + OTP payload validators
# ─────────────────────────────────────────────────────────
def validate_unique_check_payload(payload: dict) -> tuple[dict, dict]:
    """Validate payload for POST /api/auth/check-unique."""
    field_errors: dict[str, str] = {}
    if not isinstance(payload, dict):
        return {}, {"_": "Invalid request body."}

    role = str(payload.get("role", "")).lower().strip()
    if role not in ALLOWED_ROLES:
        field_errors["role"] = "Role must be 'citizen' or 'beekeeper'."

    cleaned: dict = {"role": role}

    # All three fields are optional individually, but at least one must be present
    for field in ("username", "email", "contact_no"):
        v = payload.get(field)
        if v is not None:
            if not isinstance(v, str) or not v.strip():
                field_errors[field] = f"{field} cannot be blank."
            else:
                cleaned[field] = v.strip()

    if not any(k in cleaned for k in ("username", "email", "contact_no")):
        field_errors["_"] = "Provide at least one of username, email, or contact_no."

    if "email" in cleaned:
        norm = _valid_email(cleaned["email"])
        if not norm:
            field_errors["email"] = "Please enter a valid email address."
        else:
            cleaned["email"] = norm

    if "contact_no" in cleaned and not _valid_contact(cleaned["contact_no"]):
        field_errors["contact_no"] = (
            "Phone must be 7–15 characters (digits, +, -, spaces, or parentheses)."
        )

    return cleaned, field_errors


def validate_otp_payload(payload: dict, require_code: bool = True) -> tuple[dict, dict]:
    """Validate payload for /verify-otp (require_code=True) or /resend-otp (False)."""
    field_errors: dict[str, str] = {}
    if not isinstance(payload, dict):
        return {}, {"_": "Invalid request body."}

    cleaned: dict = {}

    email = payload.get("email")
    if not _is_nonempty_str(email, max_len=50):
        field_errors["email"] = "Email is required."
    else:
        norm = _valid_email(email)
        if not norm:
            field_errors["email"] = "Please enter a valid email address."
        else:
            cleaned["email"] = norm

    role = str(payload.get("role", "")).lower().strip()
    if role not in ALLOWED_ROLES:
        field_errors["role"] = "Role must be 'citizen' or 'beekeeper'."
    else:
        cleaned["role"] = role

    if require_code:
        code = payload.get("code")
        if not isinstance(code, str) or not re.fullmatch(r"\d{6}", code.strip()):
            field_errors["code"] = "Enter the 6-digit verification code."
        else:
            cleaned["code"] = code.strip()

    return cleaned, field_errors
