# services/harvest_health.py

"""
Yield-percentage + physical-sign health engine (annual, rolling
baseline). Health_status is decided HERE, at harvest-entry time
(YieldService.add_harvest) — QueenService.evaluate_hive() no longer
computes its own yield percentage; it only reacts to whatever
health_status this engine already set (plus queen age and the
declining-after-warning rule).

SEASON MODEL
------------
  Main Harvest  : April-May       — the once-a-year primary check,
                  where physical signs are factored into the result.
  Minor Harvest : October-January — optional; not every colony
                  produces one. Adds to the year's running total, and
                  is the only way a "Weak" colony can recover mid-year
                  (see below).
  Anything else (Feb, Mar, Jun-Sep) is evaluated the same way as a
  Main harvest (percentage + symptom-aware), since the Add Yield form
  always collects physical signs regardless of month.

YEAR GROUPING
-------------
  A harvest's "harvest year" is simply the calendar year of its
  yield_date — confirmed: a January Minor harvest groups with ITS OWN
  year, not with the Oct-Dec cycle that preceded it.

BASELINE
--------
  The reference for year Y's percentage is year (Y-1)'s TOTAL harvest
  (Main + Minor, or just Main if no Minor happened) for that hive. If
  the hive has no harvests in Y-1 (first tracked year), falls back to
  the hive's one-time historical baseline (is_baseline row /
  hives.historical_yield_kg). If neither exists yet (brand-new hive,
  first-ever harvest), there's no percentage to compute at all —
  health is decided purely by whether a physical sign was checked.

RULES (evaluated against the YEAR-TO-DATE cumulative total, not the
single harvest amount alone)
--------------------------------------------------------
  Main / other-season event:
    pct >  60%  and no symptom checked  -> Healthy
    pct >  60%  and >=1 symptom checked -> Needs Attention
    pct == 60%  (regardless of symptom) -> Needs Attention
    pct <  60%  (regardless of symptom) -> Weak

  Minor event, hive CURRENTLY Weak (recovery path — percentage only,
  symptoms are NOT considered here):
    pct <= 60%           -> stays Weak
    60% < pct <= 75%      -> Needs Attention
    pct >  75%            -> Healthy

  Minor event, hive NOT currently Weak: evaluated the same way as a
  Main event (symptom-aware table above).

No baseline available yet: "Needs Attention" if a sign was checked,
otherwise "Healthy" — this becomes the hive's own basis going forward
automatically once the annual rollover kicks in.
"""
import datetime as dt

from config.config import Config
from models.yield_record import YieldModel

MAIN_MONTHS = {4, 5}
MINOR_MONTHS = {10, 11, 12, 1}

WEAK_THRESHOLD_PCT = Config.YIELD_REPLACE_THRESHOLD_PCT  # 60 by default
NEEDS_ATTENTION_CEILING_PCT = 75.0


def _as_date(v) -> dt.date:
    if isinstance(v, dt.datetime):
        return v.date()
    return v


def get_harvest_year(yield_date: dt.date) -> int:
    """Calendar year of the harvest date."""
    return yield_date.year


def is_minor_harvest(yield_date: dt.date) -> bool:
    return yield_date.month in MINOR_MONTHS


def total_harvest_for_year(hive_id: str, year: int) -> float:
    """SUM of all non-baseline yield_kg for this hive within the given
    calendar year."""
    rows = YieldModel.list_by_hive(hive_id)
    return sum(
        float(r["yield_kg"])
        for r in rows
        if not r.get("is_baseline") and _as_date(r["yield_date"]).year == year
    )


def resolve_annual_baseline(hive: dict, year: int) -> float | None:
    """
    Reference total for comparing year `year`'s cumulative harvest
    against. Prefers last year's (year-1) total; falls back to the
    hive's one-time historical baseline if year-1 has no harvests.
    """
    hive_id = hive["hive_id"]
    prior_total = total_harvest_for_year(hive_id, year - 1)
    if prior_total > 0:
        return prior_total

    baseline_row = YieldModel.find_baseline(hive_id)
    if baseline_row and baseline_row.get("yield_kg") is not None:
        return float(baseline_row["yield_kg"])

    hy = hive.get("historical_yield_kg")
    return float(hy) if hy is not None else None


def compute_health_status(
    hive: dict,
    yield_date: dt.date,
    current_health: str | None,
    has_symptom: bool,
) -> tuple[str, dict]:
    """
    Returns (new_health_status, details). `details` carries the
    numbers used (for the recommendation reason text / debugging):
    {"year", "cumulative_kg", "baseline_kg", "pct", "is_minor",
     "recovering_weak"}.
    """
    hive_id = hive["hive_id"]
    year = get_harvest_year(yield_date)
    cumulative = total_harvest_for_year(hive_id, year)
    baseline = resolve_annual_baseline(hive, year)

    is_minor = is_minor_harvest(yield_date)
    recovering_weak = is_minor and current_health == "Weak"

    details = {
        "year": year,
        "cumulative_kg": cumulative,
        "baseline_kg": baseline,
        "is_minor": is_minor,
        "recovering_weak": recovering_weak,
    }

    if baseline is None or baseline <= 0:
        status = "Needs Attention" if has_symptom else "Healthy"
        details["pct"] = None
        return status, details

    pct = round((cumulative / baseline) * 100.0, 2)
    details["pct"] = pct

    if recovering_weak:
        if pct <= WEAK_THRESHOLD_PCT:
            status = "Weak"
        elif pct <= NEEDS_ATTENTION_CEILING_PCT:
            status = "Needs Attention"
        else:
            status = "Healthy"
        return status, details

    if pct > WEAK_THRESHOLD_PCT:
        status = "Needs Attention" if has_symptom else "Healthy"
    elif pct == WEAK_THRESHOLD_PCT:
        status = "Needs Attention"
    else:
        status = "Weak"

    return status, details