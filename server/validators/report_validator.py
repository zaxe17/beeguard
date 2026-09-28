# validators/report_validator.py
#
# Citizen bee-sighting/rescue report payloads. Not to be confused
# with validators/yield_validator.py's validate_report_filters, which
# is for the BEEKEEPER yield-analytics PDF report — unrelated domain.

import datetime as dt

VALID_DANGER = {"Yes", "No"}

# reports.description is VARCHAR(50) in the schema — quite short for
# a free-text "Tell us more" box. Enforced here rather than silently
# truncating, so the citizen sees a clear validation error instead of
# their text getting cut off without warning.
DESCRIPTION_MAX_LEN = 50


def _parse_date(v):
    if isinstance(v, dt.date):
        return v
    if not isinstance(v, str):
        return None
    try:
        return dt.date.fromisoformat(v)
    except ValueError:
        return None


def _parse_time(v):
    if isinstance(v, dt.time):
        return v
    if not isinstance(v, str):
        return None
    try:
        return dt.time.fromisoformat(v)
    except ValueError:
        return None


def validate_create_report(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    cvscan_id = (payload.get("cvscan_id") or "").strip()
    if not cvscan_id:
        errors["cvscan_id"] = "cvscan_id is required — scan a photo first."
    else:
        cleaned["cvscan_id"] = cvscan_id

    try:
        cleaned["latitude"] = float(payload.get("latitude"))
    except (TypeError, ValueError):
        errors["latitude"] = "latitude is required and must be a number."
    try:
        cleaned["longitude"] = float(payload.get("longitude"))
    except (TypeError, ValueError):
        errors["longitude"] = "longitude is required and must be a number."

    bee_danger = payload.get("bee_danger")
    if bee_danger not in VALID_DANGER:
        errors["bee_danger"] = f"bee_danger must be one of {sorted(VALID_DANGER)}."
    else:
        cleaned["bee_danger"] = bee_danger

    # sighted_date / sighted_time — both optional, but if either is
    # given the other must be too (can't combine a date with no time
    # or vice versa into one DATETIME column).
    sd_raw = payload.get("sighted_date")
    st_raw = payload.get("sighted_time")
    if sd_raw or st_raw:
        sd = _parse_date(sd_raw) if sd_raw else None
        st = _parse_time(st_raw) if st_raw else None
        if not sd or not st:
            errors["sighted_at"] = "Provide BOTH sighted_date and sighted_time, or neither."
        elif dt.datetime.combine(sd, st) > dt.datetime.now():
            errors["sighted_at"] = "sighted_at cannot be in the future."
        else:
            cleaned["sighted_at"] = dt.datetime.combine(sd, st)
    else:
        cleaned["sighted_at"] = None

    description = payload.get("description")
    if description is not None:
        if not isinstance(description, str) or len(description) > DESCRIPTION_MAX_LEN:
            errors["description"] = f"description must be {DESCRIPTION_MAX_LEN} characters or fewer."
        else:
            cleaned["description"] = description.strip() or None
    else:
        cleaned["description"] = None

    return cleaned, errors