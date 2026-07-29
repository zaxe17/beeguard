from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from validators.yield_validator import validate_add_harvest, validate_set_baseline
from services.yield_service import YieldService
from utils.responses import success, error


yield_bp = Blueprint("yield", __name__, url_prefix="/api/hives/<hive_id>/yields")


def _field_errors_to_list(fe: dict) -> list[str]:
    return [f"{k}: {v}" if k != "_" else v for k, v in fe.items()]


# ── ADD HARVEST ────────────────────────────────
@yield_bp.route("", methods=["POST"])
@token_required
@role_required("beekeeper")
def add_harvest(hive_id):
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_add_harvest(payload)
    if field_errors:
        return error(
            "Validation failed.",
            errors=_field_errors_to_list(field_errors),
            status=422,
        )
    try:
        result = YieldService.add_harvest(
            g.user_id, hive_id,
            yield_kg=cleaned["yield_kg"],
            yield_date=cleaned["yield_date"],
        )
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    except Exception as e:
        print(f"[YIELD-ADD] Unhandled error: {e}")
        return error("Failed to record harvest. Please try again.", status=500)
    return success("Harvest recorded.", data=result, status=201)


# ── LIST HISTORY ───────────────────────────────
@yield_bp.route("", methods=["GET"])
@token_required
@role_required("beekeeper")
def list_history(hive_id):
    try:
        rows = YieldService.list_history(g.user_id, hive_id)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("OK", data=rows, status=200)


# ── SET / REPLACE BASELINE ─────────────────────
@yield_bp.route("/baseline", methods=["POST"])
@token_required
@role_required("beekeeper")
def set_baseline(hive_id):
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_set_baseline(payload)
    if field_errors:
        return error(
            "Validation failed.",
            errors=_field_errors_to_list(field_errors),
            status=422,
        )
    try:
        result = YieldService.set_baseline(
            g.user_id, hive_id,
            yield_kg=cleaned["yield_kg"],
            yield_year=cleaned["yield_year"],
        )
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    except Exception as e:
        print(f"[YIELD-BASELINE] Unhandled error: {e}")
        return error("Failed to set baseline. Please try again.", status=500)
    return success("Baseline updated.", data=result, status=200)