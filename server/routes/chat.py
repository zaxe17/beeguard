# routes/chat.py
import re

from flask import Blueprint, request, g, send_from_directory, abort

from middleware.auth_middleware import token_required, role_required
from services.chat_service import ChatService, CHAT_UPLOAD_DIR
from validators.chat_validator import (
    validate_start_chat,
    validate_send_message,
    validate_send_image,
    validate_send_location,
    validate_location_coords,
)
from utils.responses import success, error

chat_bp = Blueprint("chat_bp", __name__, url_prefix="/api/chats")


@chat_bp.route("/start", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def start_chat():
    cleaned, errors = validate_start_chat(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    result = ChatService.start_chat(g.role, g.user_id, cleaned["other_id"])
    return success("Chat ready.", data=result)


@chat_bp.route("", methods=["GET"])
@token_required
@role_required("citizen", "beekeeper")
def list_chats():
    chats = ChatService.list_chats(g.role, g.user_id)
    return success("Chats retrieved.", data=chats)


@chat_bp.route("/<int:chat_id>/messages", methods=["GET"])
@token_required
@role_required("citizen", "beekeeper")
def get_messages(chat_id):
    try:
        messages = ChatService.get_messages(g.role, g.user_id, chat_id)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Messages retrieved.", data=messages)


@chat_bp.route("/<int:chat_id>/messages", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def send_message(chat_id):
    cleaned, errors = validate_send_message(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        message = ChatService.send_message(g.role, g.user_id, chat_id, cleaned["content"])
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Message sent.", data=message, status=201)


@chat_bp.route("/<int:chat_id>/read", methods=["PATCH"])
@token_required
@role_required("citizen", "beekeeper")
def mark_read(chat_id):
    try:
        ChatService.mark_chat_read(g.role, g.user_id, chat_id)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Chat marked read.")


# "Mark as unread" from the "..." menu / long-press sheet.
@chat_bp.route("/<int:chat_id>/unread", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def mark_unread(chat_id):
    try:
        ChatService.mark_chat_unread(g.role, g.user_id, chat_id)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Chat marked unread.")


# ── PHOTOS ────────────────────────────────────────

# Send a photo. Body: { image: "data:image/jpeg;base64,..." }
@chat_bp.route("/<int:chat_id>/images", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def send_image(chat_id):
    cleaned, errors = validate_send_image(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        message = ChatService.send_image(g.role, g.user_id, chat_id, cleaned["image_bytes"])
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=422)
    return success("Photo sent.", data=message, status=201)


# Serves a saved chat photo. No token here because an <img> tag can't
# send one; the file names are random 128-bit UUIDs, so they can't be
# guessed.
_IMAGE_NAME_RE = re.compile(r"^[0-9a-f]{32}\.jpg$")


@chat_bp.route("/images/<filename>", methods=["GET"])
def get_image(filename):
    if not _IMAGE_NAME_RE.match(filename):
        abort(404)
    return send_from_directory(CHAT_UPLOAD_DIR, filename, max_age=60 * 60 * 24 * 30)


@chat_bp.route("/messages/<int:message_id>", methods=["DELETE"])
@token_required
@role_required("citizen", "beekeeper")
def delete_message(message_id):
    try:
        deleted = ChatService.delete_message(g.role, g.user_id, message_id)
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=404)
    if not deleted:
        return error("Message not found.", status=404)
    return success("Message deleted.")


@chat_bp.route("/<int:chat_id>", methods=["DELETE"])
@token_required
@role_required("citizen", "beekeeper")
def delete_chat(chat_id):
    try:
        deleted = ChatService.delete_chat(g.role, g.user_id, chat_id)
    except PermissionError as e:
        return error(str(e), status=403)
    if not deleted:
        return error("Chat not found.", status=404)
    return success("Chat deleted.")


# ── LOCATION SHARING ──────────────────────────────

# Send a location message.
# Body: { latitude, longitude, live_minutes }   (live_minutes 0 = one-time pin)
@chat_bp.route("/<int:chat_id>/location", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def send_location(chat_id):
    cleaned, errors = validate_send_location(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        message = ChatService.send_location(g.role, g.user_id, chat_id, cleaned)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Location shared.", data=message, status=201)


# Move the pin of a running live share. Body: { latitude, longitude }
@chat_bp.route("/messages/<int:message_id>/location", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def update_location(message_id):
    cleaned, errors = validate_location_coords(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        message = ChatService.update_live_location(g.role, g.user_id, message_id, cleaned)
    except LookupError as e:
        return error(str(e), status=404)
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=409)
    return success("Location updated.", data=message)


# End a live share early ("Stop sharing").
@chat_bp.route("/messages/<int:message_id>/location/stop", methods=["POST"])
@token_required
@role_required("citizen", "beekeeper")
def stop_location(message_id):
    try:
        message = ChatService.stop_live_location(g.role, g.user_id, message_id)
    except LookupError as e:
        return error(str(e), status=404)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Live location stopped.", data=message)