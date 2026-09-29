# services/push_service.py
#
# Push notifications (Web Push) — the phone / computer pop-up that shows
# even when BeeGuard isn't open.
#
# How it fits in:
#   1. The browser turns notifications on and sends us its subscription
#      (POST /api/push/subscribe) -> saved in push_subscriptions.
#   2. EVERY notification BeeGuard saves goes through
#      NotificationModel.insert_with_conn(), which calls
#      PushService.queue(...) — so every notification (new report nearby,
#      rescue offer, rescue resolved, pesticide alert, alert approved /
#      rejected, verification, queen...) is also pushed. Nothing else in
#      the app had to change.
#   3. A background worker sends it — but only once the notification row
#      is really saved (if the action failed and was rolled back, nothing
#      is pushed), and only if the person's settings allow that kind
#      (SettingsService.wants_notification).
#
# Needs in server/.env (make them with scripts/generate_vapid_keys.py):
#   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
# Without them, push is simply off — in-app notifications still work.

import hashlib
import json
import os
import queue
import threading
import time

from config.database import Database

try:
    from pywebpush import webpush, WebPushException
except ImportError:  # pip install pywebpush
    webpush = None
    WebPushException = Exception


# Read when needed (not at import), so they're there even if .env is
# loaded after this file is imported.
def _vapid_public() -> str:
    return os.getenv("VAPID_PUBLIC_KEY", "").strip()


def _vapid_private() -> str:
    return os.getenv("VAPID_PRIVATE_KEY", "").strip()


def _vapid_subject() -> str:
    return os.getenv("VAPID_SUBJECT", "mailto:admin@beeguard.com").strip()


PUSH_TTL_S = 24 * 60 * 60     # phone offline? deliver within a day, else drop
WAIT_FOR_COMMIT_TRIES = 10    # ~5 s for the saving transaction to finish
WAIT_FOR_COMMIT_GAP_S = 0.5

_jobs: "queue.Queue[dict]" = queue.Queue()
_worker_started = False
_worker_lock = threading.Lock()


def push_enabled() -> bool:
    return bool(webpush and _vapid_public() and _vapid_private())


def _hash(endpoint: str) -> str:
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()


def _open_url(role: str, notification_type: str, alert_id, report_id) -> str:
    """The page the notification opens when tapped."""
    if role == "beekeeper":
        if alert_id:
            return f"/beekeeper/alert/details?id={alert_id}"
        if notification_type == "verification":
            return "/beekeeper/profile"
        if report_id or notification_type in ("rescue_report", "offer_update", "rescue_resolved"):
            return "/beekeeper/report"
        return "/beekeeper"
    if role == "citizen":
        if report_id or notification_type in ("rescue_offer", "rescue_resolved"):
            return "/citizen/document"
        return "/citizen"
    # admin
    if notification_type == "new_report" and report_id:
        return f"/admin/report?report={report_id}"
    if notification_type == "alert_review":
        return "/admin/alert?tab=pending"
    if notification_type == "verify_request":
        return "/admin/profile?tab=verification"
    return "/admin"


class PushService:

    # ── subscriptions ─────────────────────────
    @staticmethod
    def public_key() -> str | None:
        return _vapid_public() or None

    @staticmethod
    def subscribe(role: str, user_id: str, sub: dict, user_agent: str | None) -> None:
        """Saves (or moves to this account) a browser's push subscription."""
        endpoint = (sub or {}).get("endpoint") or ""
        keys = (sub or {}).get("keys") or {}
        p256dh, auth = keys.get("p256dh") or "", keys.get("auth") or ""
        if not endpoint.startswith("https://") or len(endpoint) > 700:
            raise ValueError("Invalid push subscription endpoint.")
        if not p256dh or not auth or len(p256dh) > 200 or len(auth) > 100:
            raise ValueError("Invalid push subscription keys.")

        # Same browser, new login -> the subscription now belongs to
        # whoever is logged in (UNIQUE endpoint_hash).
        Database.execute(
            """
            INSERT INTO push_subscriptions
                (role, user_id, endpoint, endpoint_hash, p256dh, auth, user_agent)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                role = VALUES(role), user_id = VALUES(user_id),
                p256dh = VALUES(p256dh), auth = VALUES(auth),
                user_agent = VALUES(user_agent)
            """,
            (role, user_id, endpoint, _hash(endpoint), p256dh, auth,
             (user_agent or "")[:255] or None),
            commit=True,
        )

    @staticmethod
    def unsubscribe(endpoint: str) -> None:
        if endpoint:
            Database.execute(
                "DELETE FROM push_subscriptions WHERE endpoint_hash = %s",
                (_hash(endpoint),),
                commit=True,
            )

    # ── sending ───────────────────────────────
    @staticmethod
    def queue(notification_id: str, role: str, user_id: str, title: str,
              message: str, notification_type: str,
              alert_id=None, report_id=None) -> None:
        """
        Called for every saved notification (NotificationModel). Returns
        right away — the worker thread does the sending. Never raises.
        """
        if not push_enabled() or role not in ("citizen", "beekeeper", "admin"):
            return
        try:
            _ensure_worker()
            _jobs.put({
                "notification_id": notification_id,
                "role": role,
                "user_id": user_id,
                "type": notification_type,
                "payload": {
                    "title": title,
                    "body": message,
                    "url": _open_url(role, notification_type, alert_id, report_id),
                    "tag": notification_id,
                    "type": notification_type,
                },
            })
        except Exception as e:
            print(f"[PUSH] Couldn't queue push for {notification_id}: {e}")

    @staticmethod
    def queue_direct(role: str, user_id: str, title: str, body: str,
                     url: str, tag: str, push_type: str = "chat_message") -> None:
        """
        NEW — push that isn't tied to a saved bell notification (e.g. a new
        chat message; chats have their own unread badges, so they don't
        go in the bell list). Still respects the person's "Push
        Notifications" switch in Settings. Returns right away; never raises.
        """
        if not push_enabled() or role not in ("citizen", "beekeeper", "admin"):
            return
        try:
            _ensure_worker()
            _jobs.put({
                "direct": True,
                "notification_id": tag,
                "role": role,
                "user_id": user_id,
                "type": push_type,
                "payload": {
                    "title": title,
                    "body": body,
                    "url": url,
                    "tag": tag,
                    "type": push_type,
                },
            })
        except Exception as e:
            print(f"[PUSH] Couldn't queue direct push: {e}")

    @staticmethod
    def send_test(role: str, user_id: str) -> int:
        """'Send a test notification' — skips settings and the commit check."""
        return _send_to_user(role, user_id, {
            "title": "BeeGuard notifications are on 🐝",
            "body": "You'll get alerts here even when BeeGuard is closed.",
            "url": _open_url(role, "", None, None),
            "tag": "beeguard-test",
            "type": "test",
        })


# ── worker ────────────────────────────────────
def _ensure_worker() -> None:
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if _worker_started:
            return
        threading.Thread(target=_worker, name="beeguard-push", daemon=True).start()
        _worker_started = True


def _notification_saved(notification_id: str) -> bool:
    """Waits until the notification's transaction is committed (or gives up)."""
    for _ in range(WAIT_FOR_COMMIT_TRIES):
        row = Database.execute(
            "SELECT 1 AS ok FROM notifications WHERE notification_id = %s LIMIT 1",
            (notification_id,),
            fetchone=True,
        )
        if row:
            return True
        time.sleep(WAIT_FOR_COMMIT_GAP_S)
    return False  # rolled back — the action failed, so don't push


def _worker() -> None:
    from services.settings_service import SettingsService  # avoid import cycle
    while True:
        job = _jobs.get()
        try:
            # Bell notifications: only push once their transaction is
            # committed. Direct pushes (chat) are sent after the message
            # is already saved, so there's nothing to wait for.
            if not job.get("direct") and not _notification_saved(job["notification_id"]):
                continue
            if not SettingsService.wants_notification(job["role"], job["user_id"], job["type"]):
                continue
            _send_to_user(job["role"], job["user_id"], job["payload"])
        except Exception as e:
            print(f"[PUSH] Failed for {job.get('notification_id')}: {e}")
        finally:
            _jobs.task_done()


def _send_to_user(role: str, user_id: str, payload: dict) -> int:
    """Sends to every device this person turned notifications on. Returns how many got it."""
    if not push_enabled():
        return 0
    subs = Database.execute(
        "SELECT subscription_id, endpoint, p256dh, auth FROM push_subscriptions "
        "WHERE role = %s AND user_id = %s",
        (role, user_id),
        fetchall=True,
    ) or []

    data = json.dumps(payload, ensure_ascii=False)
    sent = 0
    for s in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": s["endpoint"],
                    "keys": {"p256dh": s["p256dh"], "auth": s["auth"]},
                },
                data=data,
                vapid_private_key=_vapid_private(),
                vapid_claims={"sub": _vapid_subject()},
                ttl=PUSH_TTL_S,
                timeout=10,
            )
            sent += 1
            Database.execute(
                "UPDATE push_subscriptions SET last_sent_at = CURRENT_TIMESTAMP "
                "WHERE subscription_id = %s",
                (s["subscription_id"],),
                commit=True,
            )
        except WebPushException as e:
            status = getattr(getattr(e, "response", None), "status_code", None)
            if status in (404, 410):
                # Browser unsubscribed / app data cleared — forget this device.
                Database.execute(
                    "DELETE FROM push_subscriptions WHERE subscription_id = %s",
                    (s["subscription_id"],),
                    commit=True,
                )
            else:
                print(f"[PUSH] Send failed ({status}): {e}")
        except Exception as e:
            print(f"[PUSH] Send failed: {e}")
    return sent