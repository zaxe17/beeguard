# validators/pesticide_validator.py

import datetime as dt

VALID_PESTICIDE_TYPES = {"Insecticide", "Herbicide", "Fungicide"}
VALID_RISK_LEVELS = {"Low", "Medium", "High"}


def _parse_datetime(v):
    """
    Accepts ISO datetimes like "2026-09-28T02:00:00.000Z" (what the
    browser's toISOString() sends) or with an offset ("+08:00").

    FIX 1: Python 3.10 and older can't read the trailing "Z", so EVERY
    alert (past or future date) failed with "scheduled_date must be an
    ISO datetime." — "Z" is now turned into "+00:00" first.
    FIX 2: the result is converted to UTC and the timezone is dropped
    before saving. A timezone-aware value mixed with the plain values
    from MySQL makes Python crash when comparing them ("can't compare
    offset-naive and offset-aware datetimes"). Saved as UTC, the same way
    the existing alerts already are, so their shown times don't change.
    """
    if isinstance(v, dt.datetime):
        parsed = v
    elif isinstance(v, str) and v.strip():
        text = v.strip()
        if text.endswith(("Z", "z")):
            text = text[:-1] + "+00:00"
        try:
            parsed = dt.datetime.fromisoformat(text)
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(dt.timezone.utc).replace(tzinfo=None)
    return parsed


def validate_create_alert(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    title = (payload.get("title") or "").strip()
    if not title or len(title) > 50:
        errors["title"] = "Title is required (max 50 characters)."
    else:
        cleaned["title"] = title

    pesticide_type = payload.get("pesticide_type")
    if pesticide_type is not None and pesticide_type not in VALID_PESTICIDE_TYPES:
        errors["pesticide_type"] = f"pesticide_type must be one of {sorted(VALID_PESTICIDE_TYPES)}."
    else:
        cleaned["pesticide_type"] = pesticide_type

    try:
        cleaned["latitude"] = float(payload.get("latitude"))
    except (TypeError, ValueError):
        errors["latitude"] = "latitude is required and must be a number."
    try:
        cleaned["longitude"] = float(payload.get("longitude"))
    except (TypeError, ValueError):
        errors["longitude"] = "longitude is required and must be a number."

    sd = _parse_datetime(payload.get("scheduled_date"))
    if sd is None:
        errors["scheduled_date"] = "scheduled_date must be an ISO datetime."
    else:
        cleaned["scheduled_date"] = sd

    exp_raw = payload.get("expiration_date")
    if exp_raw is not None:
        exp = _parse_datetime(exp_raw)
        if exp is None:
            errors["expiration_date"] = "expiration_date must be an ISO datetime."
        elif sd and exp <= sd:
            errors["expiration_date"] = "expiration_date must be after scheduled_date."
        else:
            cleaned["expiration_date"] = exp
    else:
        cleaned["expiration_date"] = None

    risk_level = payload.get("risk_level", "Medium")
    if risk_level not in VALID_RISK_LEVELS:
        errors["risk_level"] = f"risk_level must be one of {sorted(VALID_RISK_LEVELS)}."
    else:
        cleaned["risk_level"] = risk_level

    # Optional explicit radius override; service defaults per pesticide_type otherwise
    radius_raw = payload.get("danger_radius_km")
    if radius_raw is not None:
        try:
            r = float(radius_raw)
            if r <= 0:
                raise ValueError()
            cleaned["danger_radius_km"] = r
        except (TypeError, ValueError):
            errors["danger_radius_km"] = "danger_radius_km must be a positive number."
    else:
        cleaned["danger_radius_km"] = None

    affected_area = payload.get("affected_area")
    if affected_area is not None:
        if not isinstance(affected_area, str) or len(affected_area) > 100:
            errors["affected_area"] = "affected_area must be 100 characters or fewer."
        else:
            cleaned["affected_area"] = affected_area.strip() or None
    else:
        cleaned["affected_area"] = None

    return cleaned, errors