from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from services.notification_service import NotificationService
from utils.responses import success, error


notification_bp = Blueprint("notification", __name__, url_prefix="/api/notifications")


# ── LIST ───────────────────────────────────────
@notification_bp.route("", methods=["GET"])
@token_required
@role_required("beekeeper")
def list_notifications():
    unread_only = request.args.get("unread_only", default="false").lower() == "true"
    limit = request.args.get("limit", default=50, type=int)
    rows = NotificationService.list_for_beekeeper(
        g.user_id, unread_only=unread_only, limit=limit
    )
    return success("OK", data=rows, status=200)


# ── UNREAD COUNT (for the bell badge) ──────────
@notification_bp.route("/unread-count", methods=["GET"])
@token_required
@role_required("beekeeper")
def unread_count():
    count = NotificationService.unread_count(g.user_id)
    return success("OK", data={"count": count}, status=200)


# ── MARK ONE READ ──────────────────────────────
@notification_bp.route("/<notification_id>/read", methods=["POST"])
@token_required
@role_required("beekeeper")
def mark_read(notification_id):
    rc = NotificationService.mark_read(notification_id, g.user_id)
    if rc == 0:
        return error("Notification not found.", status=404)
    return success("Marked as read.", status=200)


# ── MARK ALL READ ──────────────────────────────
@notification_bp.route("/read-all", methods=["POST"])
@token_required
@role_required("beekeeper")
def mark_all_read():
    NotificationService.mark_all_read(g.user_id)
    return success("All notifications marked as read.", status=200)