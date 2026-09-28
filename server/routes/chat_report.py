# routes/chat_report.py
from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from services.chat_report_service import ChatReportService, CHAT_REPORT_CATEGORIES
from validators.chat_report_validator import validate_create_chat_report
from utils.responses import success, error

chat_report_bp = Blueprint("chat_report_bp", __name__, url_prefix="/api/chat-reports")


@chat_report_bp.route("/categories", methods=["GET"])
def list_categories():
    return success("Categories retrieved.", data=CHAT_REPORT_CATEGORIES)


@chat_report_bp.route("", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def create_report():
    cleaned, errors = validate_create_chat_report(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        report = ChatReportService.create_report(g.role, g.user_id, cleaned)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Report submitted.", data=report, status=201)
