# routes/admin.py
#
# Admin-only API. Every route requires an admin token.

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from services.admin_service import AdminService
from services.verification_service import VerificationService
from utils.responses import success, error

admin_bp = Blueprint("admin_bp", __name__, url_prefix="/api/admin")


# ── DASHBOARD ─────────────────────────────────
@admin_bp.route("/dashboard", methods=["GET"])
@token_required
@role_required("admin")
def dashboard():
    return success("OK", data=AdminService.dashboard())


# ── USERS ─────────────────────────────────────
# ?role=all|citizen|beekeeper|verification  &search=...
@admin_bp.route("/users", methods=["GET"])
@token_required
@role_required("admin")
def list_users():
    data = AdminService.list_users(
        role=request.args.get("role"),
        search=request.args.get("search"),
    )
    return success("OK", data=data)


@admin_bp.route("/users/<role>/<user_id>", methods=["GET"])
@token_required
@role_required("admin")
def get_user(role, user_id):
    try:
        data = AdminService.get_user(role, user_id)
    except ValueError as e:
        return error(str(e), status=400)
    except LookupError as e:
        return error(str(e), status=404)
    return success("OK", data=data)


# Body: { "status": "Active" | "Inactive" }
@admin_bp.route("/users/<role>/<user_id>/status", methods=["PATCH"])
@token_required
@role_required("admin")
def set_user_status(role, user_id):
    status = ((request.get_json(silent=True) or {}).get("status") or "").strip()
    try:
        data = AdminService.set_status(role, user_id, status)
    except ValueError as e:
        return error(str(e), status=422)
    except LookupError as e:
        return error(str(e), status=404)
    return success(f"Account set to {status}.", data=data)


# ── VERIFICATIONS ─────────────────────────────
# ?status=Pending (default) | Verified | Rejected | Unverified | all
@admin_bp.route("/verifications", methods=["GET"])
@token_required
@role_required("admin")
def list_verifications():
    status = request.args.get("status", "Pending")
    return success("OK", data=VerificationService.list_for_admin(status))


@admin_bp.route("/verifications/<beekeeper_id>/approve", methods=["POST"])
@token_required
@role_required("admin")
def approve_verification(beekeeper_id):
    try:
        data = VerificationService.approve(g.user_id, beekeeper_id)
    except LookupError as e:
        return error(str(e), status=404)
    except ValueError as e:
        return error(str(e), status=422)
    return success("Beekeeper verified.", data=data)


# Body: { "reason": "..." }
@admin_bp.route("/verifications/<beekeeper_id>/reject", methods=["POST"])
@token_required
@role_required("admin")
def reject_verification(beekeeper_id):
    reason = (request.get_json(silent=True) or {}).get("reason", "")
    try:
        data = VerificationService.reject(g.user_id, beekeeper_id, reason)
    except LookupError as e:
        return error(str(e), status=404)
    except ValueError as e:
        return error(str(e), status=422)
    return success("Verification rejected.", data=data)


# ── REPORTS ───────────────────────────────────
# ?status=Pending|In Progress|Resolved|False Alarm|Cancelled|all
@admin_bp.route("/reports", methods=["GET"])
@token_required
@role_required("admin")
def list_reports():
    return success("OK", data=AdminService.list_reports(request.args.get("status")))


# ── ONE REPORT (Reports page → tap a card) ────
@admin_bp.route("/reports/<report_id>", methods=["GET"])
@token_required
@role_required("admin")
def get_report(report_id):
    try:
        return success("OK", data=AdminService.get_report(report_id))
    except LookupError:
        return error("Report not found.", status=404)