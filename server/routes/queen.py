import datetime as dt

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from services.queen_service import QueenService
from services.hive_service import HiveService
from models.queen_recommendation import QueenRecommendationModel
from utils.responses import success, error


queen_bp = Blueprint("queen", __name__, url_prefix="/api/queen")


def _parse_date(v):
    if v is None:
        return None
    try:
        return dt.date.fromisoformat(v)
    except (ValueError, TypeError):
        return None


# ── ON-DEMAND EVALUATION ───────────────────────
@queen_bp.route("/evaluate/<hive_id>", methods=["GET"])
@token_required
@role_required("beekeeper")
def evaluate_hive(hive_id):
    hive = HiveService.get_hive_owned(g.user_id, hive_id)
    if not hive:
        return error("Hive not found.", status=404)
    try:
        result = QueenService.evaluate_hive(hive_id, persist=True)
    except ValueError as e:
        return error(str(e), status=400)
    except Exception as e:
        print(f"[QUEEN-EVALUATE] Unhandled error: {e}")
        return error("Failed to evaluate hive. Please try again.", status=500)
    return success("OK", data=result, status=200)


# ── CONFIRM QUEEN REPLACEMENT ──────────────────
@queen_bp.route("/confirm-replacement/<hive_id>", methods=["POST"])
@token_required
@role_required("beekeeper")
def confirm_replacement(hive_id):
    hive = HiveService.get_hive_owned(g.user_id, hive_id)
    if not hive:
        return error("Hive not found.", status=404)

    payload = request.get_json(silent=True) or {}
    installed_raw = payload.get("installed_on")
    installed_on = None
    if installed_raw is not None:
        installed_on = _parse_date(installed_raw)
        if installed_on is None:
            return error("installed_on must be an ISO date (YYYY-MM-DD).", status=422)
        if installed_on > dt.date.today():
            return error("installed_on cannot be in the future.", status=422)

    try:
        result = QueenService.confirm_replacement(hive_id, g.user_id, installed_on=installed_on)
    except Exception as e:
        print(f"[QUEEN-CONFIRM] Unhandled error: {e}")
        return error("Failed to confirm replacement. Please try again.", status=500)
    return success("Queen replacement confirmed.", data=result, status=200)


# ── LIST OPEN RECOMMENDATIONS ──────────────────
@queen_bp.route("/recommendations", methods=["GET"])
@token_required
@role_required("beekeeper")
def list_recommendations():
    recs = QueenRecommendationModel.list_open_for_beekeeper(g.user_id)
    return success("OK", data=recs, status=200)


# ── RESOLVE ─────────────────────────────────────
@queen_bp.route("/recommendations/<recommendation_id>/resolve", methods=["POST"])
@token_required
@role_required("beekeeper")
def resolve_recommendation(recommendation_id):
    rc = QueenRecommendationModel.resolve(recommendation_id, g.user_id)
    if rc == 0:
        return error("Recommendation not found or already resolved.", status=404)
    return success("Recommendation resolved.", status=200)


# ── ACKNOWLEDGE ──────────────────────────────────
@queen_bp.route("/recommendations/<recommendation_id>/acknowledge", methods=["POST"])
@token_required
@role_required("beekeeper")
def acknowledge_recommendation(recommendation_id):
    rc = QueenRecommendationModel.acknowledge(recommendation_id, g.user_id)
    if rc == 0:
        return error("Recommendation not found or already acknowledged.", status=404)
    return success("Recommendation acknowledged.", status=200)