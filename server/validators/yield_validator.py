"""
Validators for yield (harvest) payloads.
"""
import datetime as dt


def _parse_date(v):
    if isinstance(v, dt.date):
        return v
    if not isinstance(v, str):
        return None
    try:
        return dt.date.fromisoformat(v)
    except ValueError:
        return None


def validate_add_harvest(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    # yield_kg
    try:
        kg = float(payload.get("yield_kg"))
        if kg < 0:
            raise ValueError()
        cleaned["yield_kg"] = kg
    except (TypeError, ValueError):
        errors["yield_kg"] = "yield_kg must be a non-negative number."

    # yield_date (optional; defaults to today)
    yd_raw = payload.get("yield_date")
    if yd_raw is None:
        cleaned["yield_date"] = dt.date.today()
    else:
        yd = _parse_date(yd_raw)
        if yd is None:
            errors["yield_date"] = "yield_date must be YYYY-MM-DD."
        elif yd > dt.date.today():
            errors["yield_date"] = "yield_date cannot be in the future."
        else:
            cleaned["yield_date"] = yd

    return cleaned, errors


def validate_set_baseline(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    try:
        kg = float(payload.get("yield_kg"))
        if kg <= 0:
            raise ValueError()
        cleaned["yield_kg"] = kg
    except (TypeError, ValueError):
        errors["yield_kg"] = "Baseline yield_kg must be a positive number."

    try:
        yr = int(payload.get("yield_year"))
        current_year = dt.date.today().year
        if yr < 1970 or yr > current_year:
            raise ValueError()
        cleaned["yield_year"] = yr
    except (TypeError, ValueError):
        errors["yield_year"] = f"yield_year must be between 1970 and {dt.date.today().year}."

    return cleaned, errors


def validate_report_filters(args) -> tuple[dict, dict]:
    """
    Parses query-string filters for /api/reports/yield.pdf and
    /api/analytics/report. Accepts a dict-like (flask.request.args).
    """
    errors: dict[str, str] = {}
    cleaned: dict = {}

    df = args.get("date_from")
    if df:
        d = _parse_date(df)
        if not d:
            errors["date_from"] = "date_from must be YYYY-MM-DD."
        else:
            cleaned["date_from"] = d

    dt_to = args.get("date_to")
    if dt_to:
        d = _parse_date(dt_to)
        if not d:
            errors["date_to"] = "date_to must be YYYY-MM-DD."
        else:
            cleaned["date_to"] = d

    if "date_from" in cleaned and "date_to" in cleaned \
       and cleaned["date_from"] > cleaned["date_to"]:
        errors["date_range"] = "date_from must be on or before date_to."

    hive_id = args.get("hive_id")
    if hive_id:
        hive_id = hive_id.strip()
        if not hive_id.startswith("HV-"):
            errors["hive_id"] = "hive_id must be a HV-XXXXXX identifier."
        else:
            cleaned["hive_id"] = hive_id

    return cleaned, errors