# routes/citizen_report.py
#
# Citizen bee-sighting/rescue reports. Not to be confused with
# routes/report.py (the BEEKEEPER yield-analytics PDF endpoint) —
# unrelated domain, unrelated table.

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from validators.report_validator import validate_create_report
from services.citizen_report_service import CitizenReportService
from utils.responses import success, error


citizen_report_bp = Blueprint("citizen_report", __name__, url_prefix="/api/reports")


def _field_errors_to_list(fe: dict) -> list[str]:
    return [f"{k}: {v}" if k != "_" else v for k, v in fe.items()]


# ── CREATE ─────────────────────────────────────
@citizen_report_bp.route("", methods=["POST"])
@token_required
@role_required("citizen")
def create_report():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_create_report(payload)
    if field_errors:
        return error(
            "Validation failed.",
            errors=_field_errors_to_list(field_errors),
            status=422,
        )
    try:
        report = CitizenReportService.create_report(g.user_id, cleaned)
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    except Exception as e:
        print(f"[CITIZEN-REPORT-CREATE] Unhandled error: {e}")
        return error("Failed to submit report. Please try again.", status=500)
    return success("Report submitted and sent to nearby beekeepers.", data=report, status=201)


# ── LIST — this citizen's own reports ──────────
@citizen_report_bp.route("", methods=["GET"])
@token_required
@role_required("citizen")
def list_reports():
    rows = CitizenReportService.list_history(g.user_id)
    return success("OK", data=rows, status=200)


# ── DETAIL ─────────────────────────────────────
@citizen_report_bp.route("/<report_id>", methods=["GET"])
@token_required
@role_required("citizen")
def get_report(report_id):
    report = CitizenReportService.get_detail(g.user_id, report_id)
    if not report:
        return error("Report not found.", status=404)
    return success("OK", data=report, status=200)


# ── CANCEL — citizen cancels their own open report ──
@citizen_report_bp.route("/<report_id>/cancel", methods=["POST"])
@token_required
@role_required("citizen")
def cancel_report(report_id):
    try:
        report = CitizenReportService.cancel_report(g.user_id, report_id)
    except LookupError as e:
        return error(str(e), status=404)
    except ValueError as e:
        return error(str(e), status=409)
    return success("Report cancelled.", data=report, status=200)