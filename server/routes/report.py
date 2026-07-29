from flask import Blueprint, request, g, Response

from middleware.auth_middleware import token_required, role_required
from validators.yield_validator import validate_report_filters
from services.analytics_service import AnalyticsService
from services.report_service import ReportService
from models.beekeeper import BeekeeperModel
from utils.responses import error


report_bp = Blueprint("report", __name__, url_prefix="/api/reports")


# ── DOWNLOAD YIELD ANALYTICS PDF (Feature 5) ───
@report_bp.route("/yield.pdf", methods=["GET"])
@token_required
@role_required("beekeeper")
def yield_report_pdf():
    cleaned, field_errors = validate_report_filters(request.args)
    if field_errors:
        return error(
            "Validation failed.",
            errors=[f"{k}: {v}" for k, v in field_errors.items()],
            status=422,
        )

    beekeeper = BeekeeperModel.find_by_id(g.user_id)
    if not beekeeper:
        return error("Beekeeper account not found.", status=404)

    try:
        dataset = AnalyticsService.report_dataset(
            g.user_id,
            date_from=cleaned.get("date_from"),
            date_to=cleaned.get("date_to"),
            hive_id=cleaned.get("hive_id"),
        )
    except PermissionError as e:
        return error(str(e), status=403)

    try:
        pdf_bytes = ReportService.render_yield_report(dataset, {
            "id":          beekeeper.get("beekeeperID"),
            "name":        beekeeper.get("name"),
            "email":       beekeeper.get("email"),
            "farm_name":   beekeeper.get("farm_name"),
            "apiary_type": beekeeper.get("apiary_type"),
        })
    except Exception as e:
        print(f"[REPORT-PDF] Unhandled error: {e}")
        return error("Failed to generate report. Please try again.", status=500)

    filename = f"beeguard-yield-report-{beekeeper.get('beekeeperID')}.pdf"
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )