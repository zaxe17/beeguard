# routes/pesticide.py

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from validators.pesticide_validator import validate_create_alert
from services.pesticide_service import PesticideService
from models.alert import AlertModel
from utils.responses import success, error


pesticide_bp = Blueprint("pesticide", __name__, url_prefix="/api/pesticide")


def _field_errors_to_list(fe: dict) -> list[str]:
    return [f"{k}: {v}" if k != "_" else v for k, v in fe.items()]


# ── CREATE ALERT (admin OR beekeeper — beekeeper self-reports
#    publish immediately, no separate admin confirmation step) ─
@pesticide_bp.route("/alerts", methods=["POST"])
@token_required
@role_required("admin", "beekeeper")
def create_alert():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_create_alert(payload)
    if field_errors:
        return error(
            "Validation failed.",
            errors=_field_errors_to_list(field_errors),
            status=422,
        )
    try:
        result = PesticideService.create_alert(g.user_id, g.role, cleaned)
    except Exception as e:
        print(f"[PESTICIDE-CREATE] Unhandled error: {e}")
        return error("Failed to create alert. Please try again.", status=500)

    # `notified_count` is the number of OTHER beekeepers we sent a
    # notification to (matched + unlocated + outside-radius heads-ups),
    # which is what should show up in the confirmation toast/status —
    # `matched_count` is only those actually inside the danger radius.
    return success(
        f"Alert created and sent to {result['notified_count']} beekeeper(s) "
        f"({result['matched_count']} inside the danger radius).",
        data=result,
        status=201,
    )


# ── LIST — admin's own created alerts ─────────
@pesticide_bp.route("/alerts", methods=["GET"])
@token_required
@role_required("admin")
def list_admin_alerts():
    alerts = PesticideService.list_for_admin(g.user_id)
    return success("OK", data=alerts, status=200)


# ── LIST — all currently active alerts (any authenticated role) ─
@pesticide_bp.route("/alerts/active", methods=["GET"])
@token_required
def list_active_alerts():
    # Personalize risk_level (distance-derived) when a beekeeper is
    # viewing — admins and any other role see the alert's global
    # risk_level, since there's no single beekeeper's farm to compute
    # a distance against.
    beekeeper_id = g.user_id if g.role == "beekeeper" else None
    alerts = PesticideService.list_active(beekeeper_id=beekeeper_id)
    return success("OK", data=alerts, status=200)


# ── LIST — alerts a beekeeper was actually matched/notified for ─
@pesticide_bp.route("/alerts/mine", methods=["GET"])
@token_required
@role_required("beekeeper")
def list_my_alerts():
    alerts = PesticideService.list_for_beekeeper(g.user_id)
    return success("OK", data=alerts, status=200)


# ── DETAIL — single alert, full detail for the Alert Details page.
#    Any authenticated admin or beekeeper can open any alert's
#    details — the service layer used to 403 non-matched beekeepers,
#    but a pesticide alert is a public-safety notice: every beekeeper
#    on the platform should be able to see what's going on, even if
#    their own farm sits outside this alert's danger radius. ────
@pesticide_bp.route("/alerts/<alert_id>", methods=["GET"])
@token_required
@role_required("admin", "beekeeper")
def get_alert_detail(alert_id):
    try:
        detail = PesticideService.get_alert_detail(alert_id, g.user_id, g.role)
    except LookupError:
        return error("Alert not found.", status=404)
    except Exception as e:
        print(f"[PESTICIDE-DETAIL] Unhandled error: {e}")
        return error("Failed to load alert details. Please try again.", status=500)

    return success("OK", data=detail, status=200)


# ── DETAIL — recipients matched for one alert (admin only) ───
@pesticide_bp.route("/alerts/<alert_id>/recipients", methods=["GET"])
@token_required
@role_required("admin")
def alert_recipients(alert_id):
    existing = AlertModel.find_by_id(alert_id)
    if not existing:
        return error("Alert not found.", status=404)
    recipients = PesticideService.recipients_for_alert(alert_id)
    return success("OK", data=recipients, status=200)