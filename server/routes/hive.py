# routes/hive.py

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from validators.hive_validator import (
    validate_create_hive,
    validate_physical_inspection,
    VALID_STATE,
)
from services.hive_service import HiveService
from models.hive import HiveModel
from utils.responses import success, error


hive_bp = Blueprint("hive", __name__, url_prefix="/api/hives")


def _field_errors_to_list(fe: dict) -> list[str]:
    return [f"{k}: {v}" if k != "_" else v for k, v in fe.items()]


# ── CREATE ─────────────────────────────────────
@hive_bp.route("", methods=["POST"])
@token_required
@role_required("beekeeper")
def create_hive():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_create_hive(payload)
    if field_errors:
        return error(
            "Validation failed.",
            errors=_field_errors_to_list(field_errors),
            status=422,
        )
    try:
        hive = HiveService.create_hive(g.user_id, cleaned)
    except Exception as e:
        print(f"[HIVE-CREATE] Unhandled error: {e}")
        return error("Failed to create hive. Please try again.", status=500)
    return success("Hive created.", data=hive, status=201)


# ── LIST ───────────────────────────────────────
@hive_bp.route("", methods=["GET"])
@token_required
@role_required("beekeeper")
def list_hives():
    state = request.args.get("state")
    hives = HiveService.list_hives(g.user_id, state=state)
    return success("OK", data=hives, status=200)


# ── GET ONE (ownership-scoped) ─────────────────
@hive_bp.route("/<hive_id>", methods=["GET"])
@token_required
@role_required("beekeeper")
def get_hive(hive_id):
    hive = HiveService.get_hive_owned(g.user_id, hive_id)
    if not hive:
        return error("Hive not found.", status=404)
    return success("OK", data=hive, status=200)


# ── UPDATE STATE (Active / Inactive) ───────────
@hive_bp.route("/<hive_id>/state", methods=["PATCH"])
@token_required
@role_required("beekeeper")
def update_hive_state(hive_id):
    payload = request.get_json(silent=True) or {}
    new_state = payload.get("hive_state")
    if new_state not in VALID_STATE:
        return error(
            f"hive_state must be one of {sorted(VALID_STATE)}.",
            status=422,
        )
    hive = HiveService.get_hive_owned(g.user_id, hive_id)
    if not hive:
        return error("Hive not found.", status=404)

    HiveModel.update_state(hive_id, g.user_id, new_state)
    updated = HiveService.get_hive_owned(g.user_id, hive_id)
    return success("Hive state updated.", data=updated, status=200)


# ── PHYSICAL INSPECTION (MonitorHealth modal) ──
@hive_bp.route("/<hive_id>/inspection", methods=["POST"])
@token_required
@role_required("beekeeper")
def record_inspection(hive_id):
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_physical_inspection(payload)
    if field_errors:
        return error(
            "Validation failed.",
            errors=_field_errors_to_list(field_errors),
            status=422,
        )
    try:
        result = HiveService.record_physical_inspection(
            g.user_id, hive_id,
            observation_labels=cleaned["observations"],
            activity_date=cleaned["activity_date"],
        )
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    except Exception as e:
        print(f"[HIVE-INSPECTION] Unhandled error: {e}")
        return error("Failed to record inspection. Please try again.", status=500)
    return success("Inspection recorded.", data=result, status=200)


# ── MAINTENANCE HISTORY (ViewHistory modal, Monitoring tab) ───
@hive_bp.route("/<hive_id>/maintenance", methods=["GET"])
@token_required
@role_required("beekeeper")
def list_maintenance(hive_id):
    limit = request.args.get("limit", type=int)
    try:
        rows = HiveService.list_maintenance(g.user_id, hive_id, limit=limit)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("OK", data=rows, status=200)