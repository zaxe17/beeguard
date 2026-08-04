from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from validators.yield_validator import validate_report_filters
from services.analytics_service import AnalyticsService
from utils.responses import success, error


analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


# ── DASHBOARD SUMMARY TILES ────────────────────
@analytics_bp.route("/dashboard", methods=["GET"])
@token_required
@role_required("beekeeper")
def dashboard_summary():
    data = AnalyticsService.dashboard_summary(g.user_id)
    return success("OK", data=data, status=200)


# ── MONTHLY YIELD TREND (Line chart) ───────────
@analytics_bp.route("/yield-trend", methods=["GET"])
@token_required
@role_required("beekeeper")
def yield_trend():
    months = request.args.get("months", default=12, type=int)
    data = AnalyticsService.monthly_yield_trend(g.user_id, months=months)
    return success("OK", data=data, status=200)


# ── PER-HIVE YIELD TREND (History page, multi-line) ────
@analytics_bp.route("/hive-yield-trends", methods=["GET"])
@token_required
@role_required("beekeeper")
def hive_yield_trends():
    months = request.args.get("months", default=12, type=int)
    data = AnalyticsService.hive_yield_trends(g.user_id, months=months)
    return success("OK", data=data, status=200)


# ── PER-HIVE THIS-MONTH YIELD (Hives page list) ─
@analytics_bp.route("/hive-monthly-yield", methods=["GET"])
@token_required
@role_required("beekeeper")
def hive_monthly_yield():
    data = AnalyticsService.hive_monthly_totals(g.user_id)
    return success("OK", data=data, status=200)


# ── HIVE HEALTH DISTRIBUTION (Doughnut chart) ──
@analytics_bp.route("/hive-health", methods=["GET"])
@token_required
@role_required("beekeeper")
def hive_health():
    data = AnalyticsService.hive_health_distribution(g.user_id)
    return success("OK", data=data, status=200)


# ── FULL REPORT DATASET (Feature 5) ────────────
@analytics_bp.route("/report", methods=["GET"])
@token_required
@role_required("beekeeper")
def report_dataset():
    cleaned, field_errors = validate_report_filters(request.args)
    if field_errors:
        return error(
            "Validation failed.",
            errors=[f"{k}: {v}" for k, v in field_errors.items()],
            status=422,
        )
    try:
        data = AnalyticsService.report_dataset(
            g.user_id,
            date_from=cleaned.get("date_from"),
            date_to=cleaned.get("date_to"),
            hive_id=cleaned.get("hive_id"),
        )
    except PermissionError as e:
        return error(str(e), status=403)
    return success("OK", data=data, status=200)


# ── SEASONAL COMPARISON (Feature 6) ────────────
@analytics_bp.route("/seasonal-comparison", methods=["GET"])
@token_required
@role_required("beekeeper")
def seasonal_comparison():
    hive_id = request.args.get("hive_id")
    data = AnalyticsService.seasonal_comparison(g.user_id, hive_id=hive_id)
    return success("OK", data=data, status=200)