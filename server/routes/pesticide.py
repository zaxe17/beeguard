# routes/pesticide.py

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from validators.pesticide_validator import validate_create_alert
from services.pesticide_service import PesticideService
from models.alert import AlertModel
from config.database import Database
from utils.responses import success, error


pesticide_bp = Blueprint("pesticide", __name__, url_prefix="/api/pesticide")


def _field_errors_to_list(fe: dict) -> list[str]:
    return [f"{k}: {v}" if k != "_" else v for k, v in fe.items()]


# NEW — only VERIFIED beekeepers can report pesticide alerts (admins can
# always). Checked on the server too, not just by hiding the form.
UNVERIFIED_ALERT_MESSAGE = (
    "Verify your account first to add pesticide alerts. "
    "Go to Profile > Verify Your Account."
)


def _viewer_point():
    """
    NEW — the viewer's current GPS from ?lat=&lng= (admin Alerts page),
    or None when missing / invalid.
    """
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except ValueError:
        return None
    if -90 <= lat <= 90 and -180 <= lng <= 180:
        return (lat, lng)
    return None


def _beekeeper_is_verified(beekeeper_id: str) -> bool:
    row = Database.execute(
        "SELECT verification_status FROM beekeepers "
        "WHERE beekeeperID = %s AND deleted_at IS NULL LIMIT 1",
        (beekeeper_id,),
        fetchone=True,
    )
    return bool(row) and row.get("verification_status") == "Verified"


# ── CREATE ALERT (admin OR beekeeper) ─────────
#    Admin alerts go out right away. A beekeeper's alert is saved as
#    Pending and only goes out once an admin approves it.
@pesticide_bp.route("/alerts", methods=["POST"])
@token_required
@role_required("admin", "beekeeper")
def create_alert():
    if g.role == "beekeeper" and not _beekeeper_is_verified(g.user_id):
        return error(UNVERIFIED_ALERT_MESSAGE, status=403)

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

    if result.get("approval_status") == "Pending":
        return success(
            "Alert submitted. It will be shown to other beekeepers once an "
            "admin approves it.",
            data=result,
            status=201,
        )

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


# ── ADMIN REVIEW — every alert, filter by approval status ─────
#    GET /api/pesticide/alerts/review?status=Pending|Approved|Rejected|all
#        &lat=..&lng=..  (NEW, optional) admin's current GPS -> risk_level
#        is the risk at the admin's location (highest_risk_level = highest
#        beekeeper risk).
@pesticide_bp.route("/alerts/review", methods=["GET"])
@token_required
@role_required("admin")
def list_alerts_for_review():
    status = (request.args.get("status") or "all").strip().capitalize()
    alerts = PesticideService.list_for_review(
        None if status == "All" else status,
        viewer_point=_viewer_point(),
    )
    return success("OK", data=alerts, status=200)


# ── ADMIN REVIEW — approve (sends the alert out) ─────
@pesticide_bp.route("/alerts/<alert_id>/approve", methods=["POST"])
@token_required
@role_required("admin")
def approve_alert(alert_id):
    try:
        result = PesticideService.approve_alert(alert_id, g.user_id)
    except LookupError:
        return error("Alert not found.", status=404)
    except ValueError as e:
        return error(str(e), status=409)
    except Exception as e:
        print(f"[PESTICIDE-APPROVE] Unhandled error: {e}")
        return error("Failed to approve alert. Please try again.", status=500)

    return success(
        f"Alert approved and sent to {result['notified_count']} beekeeper(s) "
        f"({result['matched_count']} inside the danger radius).",
        data=result,
        status=200,
    )


# ── ADMIN REVIEW — reject (stays hidden, reporter is told why) ──
@pesticide_bp.route("/alerts/<alert_id>/reject", methods=["POST"])
@token_required
@role_required("admin")
def reject_alert(alert_id):
    payload = request.get_json(silent=True) or {}
    try:
        result = PesticideService.reject_alert(alert_id, g.user_id, payload.get("reason"))
    except LookupError:
        return error("Alert not found.", status=404)
    except ValueError as e:
        return error(str(e), status=422)
    except Exception as e:
        print(f"[PESTICIDE-REJECT] Unhandled error: {e}")
        return error("Failed to reject alert. Please try again.", status=500)

    return success("Alert rejected. The beekeeper has been notified.", data=result, status=200)


# ── LIST — all currently active alerts (any authenticated role) ─
@pesticide_bp.route("/alerts/active", methods=["GET"])
@token_required
def list_active_alerts():
    # Personalize risk_level (distance-derived) when a beekeeper is
    # viewing — admins and any other role see the alert's global
    # risk_level, since there's no single beekeeper's farm to compute
    # a distance against.
    beekeeper_id = g.user_id if g.role == "beekeeper" else None
    # (no param)     -> alerts still within their 14-day validity ("All")
    # ?include_past=1 -> also alerts that already ended
    # ?expired=1      -> ONLY alerts that already ended (History)
    truthy = ("1", "true", "yes")
    include_past = (request.args.get("include_past") or "").lower() in truthy
    only_expired = (request.args.get("expired") or "").lower() in truthy
    alerts = PesticideService.list_active(
        beekeeper_id=beekeeper_id, include_past=include_past,
        only_expired=only_expired,
    )
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
        detail = PesticideService.get_alert_detail(
            alert_id, g.user_id, g.role,
            # NEW — admin's GPS (?lat=&lng=); beekeepers use their saved pins.
            viewer_point=_viewer_point() if g.role == "admin" else None,
        )
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