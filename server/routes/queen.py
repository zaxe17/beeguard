# routes/queen.py

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from services.queen_service import QueenService
from utils.responses import success, error

queen_bp = Blueprint("queen", __name__, url_prefix="/api/queen")


# ── NEW — powers the History tab's queen-replacement grid ─────
@queen_bp.route("/history", methods=["GET"])
@token_required
@role_required("beekeeper")
def queen_history():
    data = QueenService.list_history_for_beekeeper(g.user_id)
    return success("OK", data=data, status=200)


# ── Existing-style endpoints below — MERGE with whatever your
#    actual routes/queen.py already has; these are best-guess
#    reconstructions to match queenService.confirmReplacement()
#    called from HivesModal.tsx. If your real file differs, keep
#    yours and only add the /history route above. ─────────────
@queen_bp.route("/evaluate/<hive_id>", methods=["POST"])
@token_required
@role_required("beekeeper")
def evaluate(hive_id):
    result = QueenService.evaluate_hive(hive_id, persist=True)
    return success("OK", data=result, status=200)


@queen_bp.route("/<hive_id>/confirm-replacement", methods=["POST"])
@token_required
@role_required("beekeeper")
def confirm_replacement(hive_id):
    payload = request.get_json(silent=True) or {}
    installed_on = payload.get("installed_on")  # ISO date string or None
    result = QueenService.confirm_replacement(hive_id, g.user_id, installed_on)
    return success("Queen replacement confirmed.", data=result, status=200)