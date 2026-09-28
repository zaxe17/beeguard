# services/settings_service.py
#
# On/off settings from the More → Settings page, saved in `user_settings`
# (Migration 016). Anything never changed uses the DEFAULTS below.
#
#   Per user (admin / citizen / beekeeper):
#     push_enabled          — master switch for push notifications
#     report_updates        — "New Report Updates"
#     nearby_farm_alerts    — "Nearby Farm Alerts"
#     educational_updates   — "Educational Updates"
#     system_announcements  — "System Announcements"
#
#   System-wide (admin only):
#     auto_backup           — daily automatic database backup
#
# wants_notification() is what the (upcoming) push sender checks before
# sending someone a push notification.

from config.database import Database

USER_DEFAULTS = {
    "push_enabled": True,
    "report_updates": True,
    "nearby_farm_alerts": True,
    "educational_updates": True,
    "system_announcements": True,
}

SYSTEM_DEFAULTS = {
    "auto_backup": False,
}

SYSTEM_ROLE = "system"
SYSTEM_ID = "system"
VALID_ROLES = ("admin", "citizen", "beekeeper")

# Which preference each notification type belongs to
# (notifications.notification_type).
NOTIFICATION_TYPE_SETTING = {
    "rescue_report": "report_updates",     # new citizen report near a beekeeper
    "rescue_offer": "report_updates",      # beekeeper offered on my report
    "offer_update": "report_updates",      # my offer accepted / rejected
    "rescue_resolved": "report_updates",
    "verification": "system_announcements",
    "pesticide_alert": "nearby_farm_alerts",
    # admins (Migration 018)
    "new_report": "report_updates",
    "alert_review": "nearby_farm_alerts",
    "verify_request": "system_announcements",
}


def _to_bool(v) -> bool:
    return str(v).strip().lower() in ("1", "true", "yes", "on")


def _load(role: str, user_id: str) -> dict:
    rows = Database.execute(
        "SELECT setting_key, setting_value FROM user_settings "
        "WHERE role = %s AND user_id = %s",
        (role, user_id),
        fetchall=True,
    ) or []
    return {r["setting_key"]: _to_bool(r["setting_value"]) for r in rows}


def _save(role: str, user_id: str, changes: dict) -> None:
    for key, value in changes.items():
        Database.execute(
            """
            INSERT INTO user_settings (role, user_id, setting_key, setting_value)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
            """,
            (role, user_id, key, "true" if value else "false"),
            commit=True,
        )


def _clean_changes(payload: dict, allowed: dict) -> dict:
    """Only known keys with true/false values. Raises ValueError otherwise."""
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Send at least one setting to change.")
    changes = {}
    for key, value in payload.items():
        if key not in allowed:
            raise ValueError(f"Unknown setting: {key}")
        if not isinstance(value, bool):
            raise ValueError(f"{key} must be true or false.")
        changes[key] = value
    return changes


class SettingsService:

    # ── per user ──────────────────────────────
    @staticmethod
    def get_user(role: str, user_id: str) -> dict:
        if role not in VALID_ROLES:
            raise ValueError("Invalid role.")
        return {**USER_DEFAULTS, **{
            k: v for k, v in _load(role, user_id).items() if k in USER_DEFAULTS
        }}

    @staticmethod
    def update_user(role: str, user_id: str, payload: dict) -> dict:
        if role not in VALID_ROLES:
            raise ValueError("Invalid role.")
        _save(role, user_id, _clean_changes(payload, USER_DEFAULTS))
        return SettingsService.get_user(role, user_id)

    # ── system-wide (admin) ───────────────────
    @staticmethod
    def get_system() -> dict:
        return {**SYSTEM_DEFAULTS, **{
            k: v for k, v in _load(SYSTEM_ROLE, SYSTEM_ID).items() if k in SYSTEM_DEFAULTS
        }}

    @staticmethod
    def update_system(payload: dict) -> dict:
        _save(SYSTEM_ROLE, SYSTEM_ID, _clean_changes(payload, SYSTEM_DEFAULTS))
        return SettingsService.get_system()

    # ── used by the push sender ───────────────
    @staticmethod
    def wants_notification(role: str, user_id: str, notification_type: str) -> bool:
        """False if this person turned push off, or this kind of notification off."""
        try:
            settings = SettingsService.get_user(role, user_id)
        except Exception:
            return True  # settings unreadable — don't silently drop notifications
        if not settings.get("push_enabled", True):
            return False
        pref = NOTIFICATION_TYPE_SETTING.get(notification_type)
        return settings.get(pref, True) if pref else True