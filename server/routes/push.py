# routes/push.py
#
#   GET  /api/push/public-key    -> {"public_key": "...", "enabled": true}
#   POST /api/push/subscribe     {"subscription": {endpoint, keys: {p256dh, auth}}}
#   POST /api/push/unsubscribe   {"endpoint": "..."}   (no login needed — NEW)
#   POST /api/push/test          -> sends "notifications are on" to my devices

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required
from services.push_service import PushService, push_enabled
from utils.responses import success, error


push_bp = Blueprint("push", __name__, url_prefix="/api/push")


@push_bp.route("/public-key", methods=["GET"])
def public_key():
    return success("OK", data={
        "public_key": PushService.public_key(),
        "enabled": push_enabled(),
    })


@push_bp.route("/subscribe", methods=["POST"])
@token_required
def subscribe():
    if not push_enabled():
        return error(
            "Push notifications aren't set up on the server yet (VAPID keys missing).",
            status=503,
        )
    payload = request.get_json(silent=True) or {}
    try:
        PushService.subscribe(
            g.role, g.user_id, payload.get("subscription") or {},
            request.headers.get("User-Agent"),
        )
    except ValueError as e:
        return error(str(e), status=422)
    return success("Notifications turned on for this device.")


# NEW — no login needed: it's called on LOGOUT, after the login token is
# already gone. Only removes the device whose (secret, unguessable) push
# endpoint is sent, so it can't be used to switch off anyone else.
@push_bp.route("/unsubscribe", methods=["POST"])
def unsubscribe():
    payload = request.get_json(silent=True) or {}
    PushService.unsubscribe(payload.get("endpoint") or "")
    return success("Notifications turned off for this device.")


@push_bp.route("/test", methods=["POST"])
@token_required
def test():
    sent = PushService.send_test(g.role, g.user_id)
    if not sent:
        return error("No device of yours has notifications turned on yet.", status=404)
    return success(f"Test notification sent to {sent} device(s).", data={"sent": sent})