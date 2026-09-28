# validators/rescue_offer_validator.py
import re

VALID_RESPOND_ACTIONS = {"accept", "reject"}


def validate_create_offer(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    report_id = (payload.get("report_id") or "").strip()
    if not report_id or not re.fullmatch(r"RPT-\d{6}", report_id):
        errors["report_id"] = "report_id must be a valid RPT-XXXXXX identifier."
    else:
        cleaned["report_id"] = report_id

    # The offer amount is OPTIONAL — a beekeeper may rescue for free.
    # Missing / empty / 0 all mean a free rescue (stored as 0.00, since
    # rescue_offers.offered_fee is NOT NULL).
    raw_fee = payload.get("offered_fee")
    if raw_fee is None or (isinstance(raw_fee, str) and not raw_fee.strip()):
        cleaned["offered_fee"] = 0.0
    else:
        try:
            if isinstance(raw_fee, bool):
                raise ValueError()
            fee = float(raw_fee)
            if fee < 0 or fee > 99_999_999.99:
                raise ValueError()
            cleaned["offered_fee"] = round(fee, 2)
        except (TypeError, ValueError):
            errors["offered_fee"] = "offered_fee must be 0 (free) or a positive amount."

    return cleaned, errors


def validate_respond_offer(payload: dict) -> tuple[dict, dict]:
    errors: dict[str, str] = {}
    cleaned: dict = {}

    action = str(payload.get("action", "")).lower().strip()
    if action not in VALID_RESPOND_ACTIONS:
        errors["action"] = f"action must be one of {sorted(VALID_RESPOND_ACTIONS)}."
    else:
        cleaned["action"] = action

    return cleaned, errors