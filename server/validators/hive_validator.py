"""
Validators for hive create / update / physical-inspection payloads.
Returns (cleaned, field_errors) — same shape as auth_validator.
"""
import datetime as dt

VALID_HEALTH  = {"Healthy", "Needs Attention", "Weak", "Diseased"}
VALID_STATE   = {"Active", "Inactive"}
VALID_INSPECT = {
    "Normal / Healthy",
    "Presence of Queen Cells",
    "Reduction of Open Brood",
    "Emaciated Queen",
}


def _parse_date(v):
    if isinstance(v, dt.date):
        return v
    if not isinstance(v, str):
        return None
    try:
        return dt.date.fromisoformat(v)
    except ValueError:
        return None


def _nonempty(v, max_len=None):
    if not isinstance(v, str):
        return False
    v = v.strip()
    if not v:
        return False
    if max_len is not None and len(v) > max_len:
        return False
    return True


def validate_create_hive(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    # hive_name (VARCHAR 15)
    hn = (payload.get("hive_name") or "").strip()
    if not _nonempty(hn, 15):
        errors["hive_name"] = "Hive name is required (max 15 characters)."
    else:
        cleaned["hive_name"] = hn

    # bee_species (VARCHAR 50)
    bs = (payload.get("bee_species") or "").strip()
    if not _nonempty(bs, 50):
        errors["bee_species"] = "Bee species is required (max 50 characters)."
    else:
        cleaned["bee_species"] = bs

    # date_established
    de = _parse_date(payload.get("date_established"))
    if de is None:
        errors["date_established"] = "date_established must be an ISO date (YYYY-MM-DD)."
    elif de > dt.date.today():
        errors["date_established"] = "date_established cannot be in the future."
    else:
        cleaned["date_established"] = de

    # queen_installed_date (optional; defaults to date_established server-side)
    qid_raw = payload.get("queen_installed_date")
    if qid_raw is not None:
        qid = _parse_date(qid_raw)
        if qid is None:
            errors["queen_installed_date"] = "queen_installed_date must be YYYY-MM-DD."
        elif qid > dt.date.today():
            errors["queen_installed_date"] = "queen_installed_date cannot be in the future."
        elif de and qid < de:
            errors["queen_installed_date"] = "Queen cannot be installed before the hive was established."
        else:
            cleaned["queen_installed_date"] = qid

    # health_status (optional; default 'Healthy')
    hs = payload.get("health_status")
    if hs is None:
        cleaned["health_status"] = "Healthy"
    elif hs not in VALID_HEALTH:
        errors["health_status"] = f"health_status must be one of {sorted(VALID_HEALTH)}."
    else:
        cleaned["health_status"] = hs

    # hive_state (optional; default 'Active')
    st = payload.get("hive_state")
    if st is None:
        cleaned["hive_state"] = "Active"
    elif st not in VALID_STATE:
        errors["hive_state"] = f"hive_state must be one of {sorted(VALID_STATE)}."
    else:
        cleaned["hive_state"] = st

    # ── Historical baseline (both-or-neither) ────
    hyk_raw = payload.get("historical_yield_kg")
    hyy_raw = payload.get("historical_yield_year")
    if hyk_raw is not None or hyy_raw is not None:
        # both required together
        if hyk_raw is None or hyy_raw is None:
            errors["historical_yield_kg"] = (
                "Provide BOTH historical_yield_kg and historical_yield_year, or neither."
            )
        else:
            try:
                hyk = float(hyk_raw)
                if hyk <= 0:
                    raise ValueError()
                cleaned["historical_yield_kg"] = hyk
            except (TypeError, ValueError):
                errors["historical_yield_kg"] = "historical_yield_kg must be a positive number."
            try:
                hyy = int(hyy_raw)
                current_year = dt.date.today().year
                if hyy < 1970 or hyy > current_year:
                    raise ValueError()
                cleaned["historical_yield_year"] = hyy
            except (TypeError, ValueError):
                errors["historical_yield_year"] = f"historical_yield_year must be between 1970 and {dt.date.today().year}."

    return cleaned, errors


def validate_physical_inspection(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    obs = payload.get("observation")
    if obs not in VALID_INSPECT:
        errors["observation"] = f"observation must be one of {sorted(VALID_INSPECT)}."
    else:
        cleaned["observation"] = obs

    ad_raw = payload.get("activity_date")
    if ad_raw is None:
        cleaned["activity_date"] = dt.date.today()
    else:
        ad = _parse_date(ad_raw)
        if ad is None:
            errors["activity_date"] = "activity_date must be YYYY-MM-DD."
        elif ad > dt.date.today():
            errors["activity_date"] = "activity_date cannot be in the future."
        else:
            cleaned["activity_date"] = ad

    return cleaned, errors