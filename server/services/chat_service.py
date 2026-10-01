# services/chat_service.py
import datetime as dt
import io
import os
import threading
import uuid

from flask import has_request_context, request
from PIL import Image, ImageOps, UnidentifiedImageError

from models.chat import ChatModel
from models.message import MessageModel


# Photos sent in chat are saved here (backend/uploads/chat/) and served
# by GET /api/chats/images/<filename> (routes/chat.py).
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAT_UPLOAD_DIR = os.path.join(BACKEND_ROOT, "uploads", "chat")
CHAT_IMAGE_MAX_SIDE = 1600  # px — longest side after resizing


def _sender_role(role: str) -> str:
    return "Citizen" if role == "citizen" else "Beekeeper"


def _push_new_message(role: str, user_id: str, chat_id: int, preview: str) -> None:
    """
    Phone/computer pop-up for the OTHER person in the chat when a
    message is sent. Tapping it opens that chat. Uses the same tag per
    chat, so several messages replace each other instead of stacking.
    Never raises: a failed push must not fail the message.
    """
    try:
        from services.push_service import PushService  # lazy: avoids import cycle

        chat = ChatModel.find_by_id(chat_id)
        if not chat:
            return
        if role == "citizen":
            to_role, to_id = "beekeeper", chat.get("beekeeperID")
            from models.citizen import CitizenModel
            sender = CitizenModel.find_by_id(user_id) or {}
        else:
            to_role, to_id = "citizen", chat.get("citizenID")
            from models.beekeeper import BeekeeperModel
            sender = BeekeeperModel.find_by_id(user_id) or {}
        if not to_id:
            return

        name = sender.get("name") or ("A citizen" if role == "citizen" else "A beekeeper")
        text = (preview or "").strip()
        if len(text) > 120:
            text = text[:117] + "…"
        PushService.queue_direct(
            role=to_role,
            user_id=to_id,
            title=name,
            body=text or "Sent you a message",
            url=f"/{to_role}/messages?chat={chat_id}",
            tag=f"chat-{chat_id}",
        )
    except Exception as e:
        print(f"[PUSH] Chat push failed for chat {chat_id}: {e}")


def _push_new_message_bg(role: str, user_id: str, chat_id: int, preview: str) -> None:
    """
    The push pop-up needs 3+ database lookups, and the sender doesn't
    need to wait for any of them. Run it in a background thread so the
    request returns as soon as the message is saved.
    """
    threading.Thread(
        target=_push_new_message,
        args=(role, user_id, chat_id, preview),
        name="beeguard-chat-push",
        daemon=True,
    ).start()


def _to_float(value):
    # DECIMAL columns come back from PyMySQL as decimal.Decimal,
    # which Flask's JSON encoder can't serialize.
    return float(value) if value is not None else None


def _image_url(filename):
    """DB stores only the file name; the browser needs a full URL."""
    if not filename:
        return None
    path = f"/api/chats/images/{filename}"
    if has_request_context():
        return request.host_url.rstrip("/") + path
    return path


def _profile_photo_path(value):
    """DB may store just the file name; the frontend needs /uploads/profile/..."""
    if not value:
        return None
    if value.startswith(("http://", "https://", "/")):
        return value
    return f"/uploads/profile/{value}"


def _serialize_message(row: dict) -> dict:
    sent_at = row.get("sent_at")
    age = row.get("location_age_seconds")
    return {
        "message_id":  row["message_id"],
        "chat_id":     row["chat_id"],
        "sender_role": row["sender_role"],
        "content":     row["message_content"],
        "is_read":     bool(row["is_read"]),
        "sent_at":     sent_at.isoformat() if isinstance(sent_at, (dt.date, dt.datetime)) else sent_at,
        "message_type": row.get("message_type") or "text",
        # ── image (migration 010) ──
        "image_url":   _image_url(row.get("image_url")),
        # ── location (migration 009) ──
        "latitude":             _to_float(row.get("latitude")),
        "longitude":            _to_float(row.get("longitude")),
        "live_share":           row.get("live_until") is not None,
        "is_live":              bool(row.get("is_live")),
        "live_seconds_left":    int(row.get("live_seconds_left") or 0),
        "location_age_seconds": int(age) if age is not None else None,
    }


def _save_chat_image(data: bytes) -> str:
    """
    Re-encodes the upload as a JPEG and returns the saved file name.
    Re-encoding (instead of saving the raw bytes) guarantees the file
    really is an image, strips EXIF (incl. GPS) and caps the size.
    """
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ValueError("That file isn't a valid image.")

    img = ImageOps.exif_transpose(img)  # keep phone photos upright
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        img = background
    else:
        img = img.convert("RGB")
    img.thumbnail((CHAT_IMAGE_MAX_SIDE, CHAT_IMAGE_MAX_SIDE))

    os.makedirs(CHAT_UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    img.save(os.path.join(CHAT_UPLOAD_DIR, filename), "JPEG", quality=85, optimize=True)
    return filename


class ChatService:

    # ── START ────────────────────────────────
    @staticmethod
    def start_chat(role: str, user_id: str, other_id: str) -> dict:
        if role == "citizen":
            citizen_id, beekeeper_id = user_id, other_id
        else:
            citizen_id, beekeeper_id = other_id, user_id
        chat_id = ChatModel.find_or_create(citizen_id, beekeeper_id)
        return {"chat_id": chat_id}

    # ── LIST (ChatPage sidebar) ──────────────
    @staticmethod
    def list_chats(role: str, user_id: str) -> list[dict]:
        # NOTE: still 2 queries per chat (latest message + unread count).
        # Fixing that needs a JOIN in models/chat.py + models/message.py.
        rows = (
            ChatModel.list_for_citizen(user_id) if role == "citizen"
            else ChatModel.list_for_beekeeper(user_id)
        )
        out = []
        for r in rows:
            chat_id = r["chat_id"]
            latest = MessageModel.latest_for_chat(chat_id)
            unread = MessageModel.count_unread_for_role(chat_id, role)
            marked_unread = ChatModel.is_marked_unread(r, role)
            out.append({
                "chat_id":  chat_id,
                "name":     r.get("other_name"),
                "location": r.get("other_location") or "",
                "photo":    _profile_photo_path(r.get("other_photo")),
                "message":  latest["message_content"] if latest else "",
                "active":   True,
                "read":     unread == 0 and not marked_unread,
                "unread_count": unread,
            })
        return out

    # ── MESSAGES ──────────────────────────────
    @staticmethod
    def get_messages(role: str, user_id: str, chat_id: int,
                     limit: int = 200, before_id: int | None = None) -> list[dict]:
        """
        Newest `limit` messages, oldest -> newest (Messenger-style: the
        latest ones first, older ones loaded when you scroll up).
          before_id -> the page of messages just before that message.
        Loading an older page doesn't mark anything as read.

        The chat is polled every few seconds, so the UPDATE only runs
        when this page really contains unread messages from the other
        person.
        """
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")

        rows = MessageModel.list_by_chat(chat_id, limit=limit, before_id=before_id)

        if before_id is None:
            me = _sender_role(role)
            incoming_unread = [
                m for m in rows
                if m["sender_role"] != me and not m["is_read"]
            ]
            if incoming_unread:
                MessageModel.mark_read_for_role(chat_id, role)
                # Show them as read in this response, like before.
                for m in incoming_unread:
                    m["is_read"] = 1

            # Opening the conversation clears "Mark as unread".
            chat = ChatModel.find_by_id(chat_id)
            if chat and ChatModel.is_marked_unread(chat, role):
                ChatModel.set_marked_unread(chat_id, role, False)

        return [_serialize_message(m) for m in rows]

    @staticmethod
    def send_message(role: str, user_id: str, chat_id: int, content: str) -> dict:
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        message_id = MessageModel.insert(chat_id, _sender_role(role), content)
        _push_new_message_bg(role, user_id, chat_id, content)
        return _serialize_message(MessageModel.find_by_id(message_id))

    @staticmethod
    def send_image(role: str, user_id: str, chat_id: int, image_bytes: bytes) -> dict:
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        filename = _save_chat_image(image_bytes)
        try:
            message_id = MessageModel.insert_image(chat_id, _sender_role(role), filename)
        except Exception:
            # Don't leave an orphan file if the DB insert fails.
            try:
                os.remove(os.path.join(CHAT_UPLOAD_DIR, filename))
            except OSError:
                pass
            raise
        _push_new_message_bg(role, user_id, chat_id, "📷 Sent a photo")
        return _serialize_message(MessageModel.find_by_id(message_id))

    @staticmethod
    def mark_chat_read(role: str, user_id: str, chat_id: int) -> int:
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        ChatModel.set_marked_unread(chat_id, role, False)
        return MessageModel.mark_read_for_role(chat_id, role)

    @staticmethod
    def mark_chat_unread(role: str, user_id: str, chat_id: int) -> int:
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        return ChatModel.set_marked_unread(chat_id, role, True)

    @staticmethod
    def delete_message(role: str, user_id: str, message_id: int) -> int:
        message = MessageModel.find_by_id(message_id)
        if not message:
            raise ValueError("Message not found.")
        if not ChatModel.is_participant(message["chat_id"], role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        if message["sender_role"] != _sender_role(role):
            raise PermissionError("You can only delete your own messages.")
        return MessageModel.delete(message_id, _sender_role(role))

    @staticmethod
    def delete_chat(role: str, user_id: str, chat_id: int) -> int:
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        return ChatModel.delete(chat_id)

    # ── LOCATION SHARING ──────────────────────
    @staticmethod
    def send_location(role: str, user_id: str, chat_id: int, payload: dict) -> dict:
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        message_id = MessageModel.insert_location(
            chat_id,
            _sender_role(role),
            payload["latitude"],
            payload["longitude"],
            payload["live_minutes"],
        )
        _push_new_message_bg(
            role, user_id, chat_id,
            "📍 Is sharing their live location" if payload.get("live_minutes")
            else "📍 Shared a location",
        )
        return _serialize_message(MessageModel.find_by_id(message_id))

    @staticmethod
    def _own_location_message(role: str, user_id: str, message_id: int) -> dict:
        message = MessageModel.find_by_id(message_id)
        if not message or message.get("message_type") != "location":
            raise LookupError("Location message not found.")
        if not ChatModel.is_participant(message["chat_id"], role, user_id):
            raise PermissionError("You are not a participant of this chat.")
        if message["sender_role"] != _sender_role(role):
            raise PermissionError("You can only change your own location.")
        return message

    @staticmethod
    def update_live_location(role: str, user_id: str, message_id: int, payload: dict) -> dict:
        message = ChatService._own_location_message(role, user_id, message_id)
        if not message.get("is_live"):
            raise ValueError("This live location has already ended.")
        MessageModel.update_live_location(
            message_id, _sender_role(role), payload["latitude"], payload["longitude"],
        )
        return _serialize_message(MessageModel.find_by_id(message_id))

    @staticmethod
    def stop_live_location(role: str, user_id: str, message_id: int) -> dict:
        ChatService._own_location_message(role, user_id, message_id)
        MessageModel.stop_live_location(message_id, _sender_role(role))
        return _serialize_message(MessageModel.find_by_id(message_id))