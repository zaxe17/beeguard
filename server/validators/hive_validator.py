# hive_validator.py

"""
Validators for hive create / update / physical-inspection payloads.
Returns (cleaned, field_errors) — same shape as auth_validator.
"""
import datetime as dt

from utils.dates import ph_today

VALID_HEALTH  = {"Healthy", "Needs Attention", "Weak", "Diseased"}
# Suggested species in the Add Hive dropdown. The beekeeper can also
# type another species. Keep in sync with HIVE_SPECIES in
# frontend/data/species.ts.
HIVE_SPECIES  = (
    # Honey bees
    "Apis mellifera", "Apis cerana", "Apis dorsata", "Apis breviligula",
    "Apis nigrocincta", "Apis florea", "Apis andreniformis",
    "Apis laboriosa", "Apis koschevnikovi", "Apis nuluensis",
    # Stingless bees (Philippines)
    "Tetragonula biroi", "Tetragonula iridipennis", "Tetragonula laeviceps",
    "Tetragonula sapiens",
)
VALID_STATE   = {"Active", "Inactive"}
NORMAL_LABEL  = "Normal / Healthy"
VALID_INSPECT = {
    NORMAL_LABEL,
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


LOCATION_MAX = 100


def _clean_location(payload: dict, errors: dict, cleaned: dict) -> None:
    """
    NEW — hive location (all optional):
      location   text shown on the cards, max 100 characters
      latitude / longitude   the map pin — both or neither
    Blank / null clears it. Only the keys that were sent are touched.
    """
    if "location" in payload:
        loc = " ".join((payload.get("location") or "").split())
        if len(loc) > LOCATION_MAX:
            errors["location"] = f"Location is too long (max {LOCATION_MAX} characters)."
        else:
            cleaned["location"] = loc or None

    if "latitude" in payload or "longitude" in payload:
        lat_raw, lng_raw = payload.get("latitude"), payload.get("longitude")
        if lat_raw in (None, "") and lng_raw in (None, ""):
            cleaned["latitude"] = None
            cleaned["longitude"] = None
            return
        try:
            lat, lng = float(lat_raw), float(lng_raw)
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                raise ValueError()
            cleaned["latitude"] = round(lat, 7)
            cleaned["longitude"] = round(lng, 7)
        except (TypeError, ValueError):
            errors["latitude"] = "Pin the hive on the map (valid latitude and longitude)."


def validate_create_hive(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    # hive_name (VARCHAR 15)
    hn = (payload.get("hive_name") or "").strip()
    if not _nonempty(hn, 15):
        errors["hive_name"] = "Hive name is required (max 15 characters)."
    else:
        cleaned["hive_name"] = hn

    # bee_species (VARCHAR 50) — pick from the dropdown OR type one.
    # A typed name that matches a listed species (any upper/lower case)
    # is saved in the standard spelling, e.g. "apis CERANA" -> "Apis cerana".
    bs = " ".join((payload.get("bee_species") or "").split())
    if not _nonempty(bs, 50):
        errors["bee_species"] = "Bee species is required (max 50 characters)."
    else:
        match = next((sp for sp in HIVE_SPECIES if sp.lower() == bs.lower()), None)
        cleaned["bee_species"] = match or bs

    # date_established
    de = _parse_date(payload.get("date_established"))
    if de is None:
        errors["date_established"] = "date_established must be an ISO date (YYYY-MM-DD)."
    elif de > ph_today():
        errors["date_established"] = "date_established cannot be in the future."
    else:
        cleaned["date_established"] = de

    # queen_installed_date (optional; defaults to date_established server-side)
    qid_raw = payload.get("queen_installed_date")
    if qid_raw is not None:
        qid = _parse_date(qid_raw)
        if qid is None:
            errors["queen_installed_date"] = "queen_installed_date must be YYYY-MM-DD."
        elif qid > ph_today():
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
                current_year = ph_today().year
                if hyy < 1970 or hyy > current_year:
                    raise ValueError()
                cleaned["historical_yield_year"] = hyy
            except (TypeError, ValueError):
                errors["historical_yield_year"] = f"historical_yield_year must be between 1970 and {ph_today().year}."

    # NEW — location + map pin
    _clean_location(payload, errors, cleaned)

    return cleaned, errors


def _as_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    return v


def validate_update_hive(payload: dict, current: dict) -> tuple[dict, dict]:
    """
    NEW — Edit Hive (PATCH /api/hives/<id>). Every field is optional;
    only what's sent is changed. `current` is the hive as saved now, used
    to check the dates against each other.
      hive_name, bee_species, date_established, queen_installed_date,
      hive_state, location, latitude, longitude
    (health_status isn't edited here — it comes from Monitor Hive Health,
    Add Yield and the queen-age rule.)
    """
    errors: dict[str, str] = {}
    cleaned: dict = {}

    if "hive_name" in payload:
        hn = (payload.get("hive_name") or "").strip()
        if not _nonempty(hn, 15):
            errors["hive_name"] = "Hive name is required (max 15 characters)."
        else:
            cleaned["hive_name"] = hn

    if "bee_species" in payload:
        bs = " ".join((payload.get("bee_species") or "").split())
        if not _nonempty(bs, 50):
            errors["bee_species"] = "Bee species is required (max 50 characters)."
        else:
            match = next((sp for sp in HIVE_SPECIES if sp.lower() == bs.lower()), None)
            cleaned["bee_species"] = match or bs

    if "date_established" in payload:
        de = _parse_date(payload.get("date_established"))
        if de is None:
            errors["date_established"] = "date_established must be an ISO date (YYYY-MM-DD)."
        elif de > ph_today():
            errors["date_established"] = "date_established cannot be in the future."
        else:
            cleaned["date_established"] = de

    if "queen_installed_date" in payload:
        raw = payload.get("queen_installed_date")
        if raw in (None, ""):
            # Blank -> same as the hive's date established.
            cleaned["queen_installed_date"] = None
        else:
            qid = _parse_date(raw)
            if qid is None:
                errors["queen_installed_date"] = "queen_installed_date must be YYYY-MM-DD."
            elif qid > ph_today():
                errors["queen_installed_date"] = "queen_installed_date cannot be in the future."
            else:
                cleaned["queen_installed_date"] = qid

    if "hive_state" in payload:
        st = payload.get("hive_state")
        if st not in VALID_STATE:
            errors["hive_state"] = f"hive_state must be one of {sorted(VALID_STATE)}."
        else:
            cleaned["hive_state"] = st

    # NEW — location + map pin
    _clean_location(payload, errors, cleaned)

    # Blank queen date -> date established (the new one if it changed).
    new_de = cleaned.get("date_established") or _as_date(current.get("date_established"))
    if "queen_installed_date" in cleaned and cleaned["queen_installed_date"] is None:
        cleaned["queen_installed_date"] = new_de

    # The queen can't be installed before the hive existed.
    new_q = (
        cleaned.get("queen_installed_date")
        if "queen_installed_date" in cleaned
        else _as_date(current.get("queen_installed_date"))
    )
    if (
        "queen_installed_date" not in errors
        and "date_established" not in errors
        and new_de and new_q and new_q < new_de
    ):
        errors["queen_installed_date"] = (
            "Queen cannot be installed before the hive was established."
        )

    if not cleaned and not errors:
        errors["_"] = "Nothing to update."

    return cleaned, errors


def validate_physical_inspection(payload: dict) -> tuple[dict, dict]:
    """
    NOTE: this now expects `observations` — a NON-EMPTY LIST of one or
    more of VALID_INSPECT (checkboxes, not a single radio choice
    anymore). "Normal / Healthy" is mutually exclusive with the other
    three — if present, it must be the only item selected.
    """
    errors: dict[str, str] = {}
    cleaned: dict = {}

    obs_raw = payload.get("observations")
    if not isinstance(obs_raw, list) or len(obs_raw) == 0:
        errors["observations"] = (
            f"observations must be a non-empty list containing one or "
            f"more of {sorted(VALID_INSPECT)}."
        )
    else:
        seen: list[str] = []
        invalid_found = False
        for o in obs_raw:
            if o not in VALID_INSPECT:
                invalid_found = True
                break
            if o not in seen:
                seen.append(o)

        if invalid_found:
            errors["observations"] = f"observations must only contain values from {sorted(VALID_INSPECT)}."
        elif NORMAL_LABEL in seen and len(seen) > 1:
            errors["observations"] = "'Normal / Healthy' cannot be combined with other symptoms."
        else:
            cleaned["observations"] = seen

    ad_raw = payload.get("activity_date")
    if ad_raw is None or (isinstance(ad_raw, str) and not ad_raw.strip()):
        errors["activity_date"] = "activity_date is required (YYYY-MM-DD)."
    else:
        ad = _parse_date(ad_raw)
        if ad is None:
            errors["activity_date"] = "activity_date must be YYYY-MM-DD."
        elif ad > ph_today():
            errors["activity_date"] = "activity_date cannot be in the future."
        else:
            cleaned["activity_date"] = ad

    return cleaned, errors