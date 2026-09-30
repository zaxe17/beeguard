"""
Notification fan-out service.

Producers:
  - notify_queen       (QueenService.evaluate_hive — same transaction)
  - notify_new_report  (citizen submits a bee report -> nearby beekeepers)
  - notify_offer_update(citizen accepts / rejects an offer, or cancels
                        the report -> the beekeepers who offered)
  - offer_received_item  (beekeeper offers on a report -> the CITIZEN)
  - rescue_resolved_item (rescue marked done -> the OTHER party)
  - admin_items          (-> every active ADMIN, Migration 018):
        new swarm report / pesticide alert to approve / verification

Migration 012: notifications can go to citizens too (citizen_id
instead of beekeeper_id).

Report-related notifications are sent with notify_many(), AFTER the
main action has committed, on their own connection. A notification
failing to save must never undo the citizen's report or response.
"""
import datetime as dt

from config.database import Database
from models.notification import NotificationModel

# FIX — notification times were 8 hours off in the app.
# The DB connection runs in Philippine time (config/database.py sets
# time_zone '+08:00'), so created_at comes back as PH time WITHOUT a
# timezone. Flask then sent it as "... GMT", the browser added 8 hours,
# and a brand-new notification looked 8 hours in the FUTURE -> it said
# "just now" for 8 hours, and older ones showed 8 hours too little.
# Now the time is sent with its real offset, e.g. 2026-09-30T14:13:05+08:00.
PH_TZ = dt.timezone(dt.timedelta(hours=8))


def _with_ph_offset(value):
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=PH_TZ)
        return value.isoformat()
    return value


def _serialize_times(rows: list[dict]) -> list[dict]:
    for r in rows:
        if "created_at" in r:
            r["created_at"] = _with_ph_offset(r["created_at"])
    return rows

# notifications.notification_type values (VARCHAR(20)) — the frontend's
# components/popup/Notification.tsx picks the icon and click target
# from these.
TYPE_QUEEN = "queen_recommendation"
TYPE_RESCUE_REPORT = "rescue_report"
TYPE_OFFER_UPDATE = "offer_update"
TYPE_RESCUE_OFFER = "rescue_offer"        # -> citizen
TYPE_RESCUE_RESOLVED = "rescue_resolved"  # -> citizen or beekeeper
TYPE_VERIFICATION = "verification"        # -> beekeeper (admin review result)
# -> admins (Migration 018)
TYPE_ADMIN_NEW_REPORT = "new_report"          # citizen sent a swarm report
TYPE_ADMIN_ALERT_REVIEW = "alert_review"      # beekeeper alert waiting for approval
TYPE_ADMIN_VERIFY_REQUEST = "verify_request"  # beekeeper uploaded a document

# notifications.title is VARCHAR(30).
TITLE_MAX_LEN = 30

# Same labels as the frontend's data/species.ts:
# "Apis cerana" -> "Apis cerana / Asian Honey Bee".
SPECIES_ENGLISH_NAMES = {
    "Apis cerana": "Asian Honey Bee",
    "Apis mellifera": "Western Honey Bee",
    "Apis dorsata": "Giant Honey Bee",
    "Tetragonula biroi": "Philippine Stingless Bee",
}


def species_label(species: str | None) -> str:
    if not species or species == "Unidentified":
        return "A bee colony"
    parts = species.strip().split()
    scientific = " ".join([parts[0].capitalize()] + [p.lower() for p in parts[1:]])
    english = SPECIES_ENGLISH_NAMES.get(scientific)
    return f"{scientific} ({english})" if english else scientific


class NotificationService:

    # ── Queen recommendation ──────────────────
    @staticmethod
    def notify_queen(*, conn, beekeeper_id: str, hive_id: str,
                      level: str, reason: str) -> str:
        """
        Called from QueenService.evaluate_hive() when a Monitor or
        Replace recommendation is created. Writes on the SAME
        connection so it commits atomically with the recommendation.
        """
        title = (
            "Queen Replacement Recommended"
            if level == "Replace" else "Hive Monitoring Advised"
        )
        message = f"{hive_id}: {reason}"
        return NotificationModel.insert_with_conn(conn, {
            "beekeeper_id":       beekeeper_id,
            "alert_id":           None,
            "report_id":          None,
            "title":              title,
            "message":            message,
            "notification_type":  TYPE_QUEEN,
        })

    # ── Bee rescue reports ────────────────────
    @staticmethod
    def new_report_item(*, beekeeper_id: str, report_id: str,
                        species: str | None, distance_km: float | None) -> dict:
        where = (
            f"{distance_km} km from your farm" if distance_km is not None
            else "near your farm"
        )
        return {
            "beekeeper_id":      beekeeper_id,
            "alert_id":          None,
            "report_id":         report_id,
            "title":             "New Bee Rescue Report",
            "message":           f"{species_label(species)} was reported {where}. "
                                 f"Tap to view it and make an offer.",
            "notification_type": TYPE_RESCUE_REPORT,
        }

    @staticmethod
    def offer_update_item(*, beekeeper_id: str, report_id: str,
                          title: str, message: str) -> dict:
        return {
            "beekeeper_id":      beekeeper_id,
            "alert_id":          None,
            "report_id":         report_id,
            "title":             title[:TITLE_MAX_LEN],
            "message":           message,
            "notification_type": TYPE_OFFER_UPDATE,
        }

    @staticmethod
    def offer_received_item(*, citizen_id: str, report_id: str,
                            beekeeper_name: str | None, offered_fee,
                            again: bool = False) -> dict:
        """again=True: this beekeeper's earlier offer was declined and they sent a new one."""
        who = beekeeper_name or "A beekeeper"
        try:
            fee = float(offered_fee or 0)
        except (TypeError, ValueError):
            fee = 0.0
        what = f"offered PHP {fee:,.2f}".replace(".00", "") if fee > 0 else "offered a free rescue"
        if again:
            what = "sent a new offer: " + what.replace("offered ", "", 1)
        return {
            "citizen_id":        citizen_id,
            "alert_id":          None,
            "report_id":         report_id,
            "title":             "New Rescue Offer",
            "message":           f"{who} {what} for report {report_id}. "
                                 f"Tap to view and accept or reject it.",
            "notification_type": TYPE_RESCUE_OFFER,
        }

    @staticmethod
    def rescue_resolved_item(*, report_id: str, citizen_id: str | None = None,
                             beekeeper_id: str | None = None,
                             other_name: str | None = None) -> dict:
        """Exactly one of citizen_id / beekeeper_id — whoever DIDN'T mark it done."""
        if citizen_id:
            message = (
                f"{other_name or 'The beekeeper'} marked the rescue for report "
                f"{report_id} as resolved. Tap to rate them."
            )
        else:
            message = (
                f"The citizen marked the rescue for report {report_id} as resolved. "
                f"Thank you for helping the bees!"
            )
        return {
            "citizen_id":        citizen_id,
            "beekeeper_id":      beekeeper_id,
            "alert_id":          None,
            "report_id":         report_id,
            "title":             "Rescue Resolved",
            "message":           message,
            "notification_type": TYPE_RESCUE_RESOLVED,
        }

    @staticmethod
    def verification_item(*, beekeeper_id: str, approved: bool,
                          reason: str | None = None) -> dict:
        if approved:
            title = "Account Verified"
            message = ("Your beekeeper account has been verified. "
                       "You can now view bee reports and send rescue offers.")
        else:
            title = "Verification Rejected"
            message = (f"Your verification was rejected: {reason}. "
                       f"Please upload a new document from your profile.")
        return {
            "beekeeper_id":      beekeeper_id,
            "alert_id":          None,
            "report_id":         None,
            "title":             title,
            "message":           message,
            "notification_type": TYPE_VERIFICATION,
        }

    # ── Admins (Migration 018) ────────────────
    @staticmethod
    def admin_items(*, title: str, message: str, notification_type: str,
                    alert_id: str | None = None, report_id: str | None = None,
                    conn=None) -> list[dict]:
        """
        One notification per ACTIVE admin (each admin reads / clears their
        own). Pass `conn` to read the admin list inside a transaction.
        """
        sql = "SELECT adminID FROM admins WHERE status = 'Active' AND deleted_at IS NULL"
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(sql)
                admins = cur.fetchall() or []
        else:
            admins = Database.execute(sql, (), fetchall=True) or []
        return [
            {
                "admin_id":          a["adminID"],
                "alert_id":          alert_id,
                "report_id":         report_id,
                "title":             title[:TITLE_MAX_LEN],
                "message":           message,
                "notification_type": notification_type,
            }
            for a in admins
        ]

    @staticmethod
    def notify_admins(*, title: str, message: str, notification_type: str,
                      alert_id: str | None = None, report_id: str | None = None) -> int:
        """Best-effort, after the main action committed (like notify_many)."""
        try:
            items = NotificationService.admin_items(
                title=title, message=message, notification_type=notification_type,
                alert_id=alert_id, report_id=report_id,
            )
        except Exception as e:
            print(f"[NOTIFY] Couldn't load admins: {e}")
            return 0
        return NotificationService.notify_many(items)

    @staticmethod
    def notify_many(items: list[dict]) -> int:
        """
        Best-effort: saves every notification in one transaction on a
        fresh connection. Logs and returns 0 on failure instead of
        raising, so the caller's already-committed action stands.
        """
        if not items:
            return 0
        conn = Database.get_connection()
        try:
            for item in items:
                NotificationModel.insert_with_conn(conn, item)
            conn.commit()
            return len(items)
        except Exception as e:
            conn.rollback()
            print(f"[NOTIFY] Failed to save {len(items)} notification(s): {e}")
            return 0
        finally:
            conn.close()

    # ── Read-side (any role — routes/notification.py) ──
    @staticmethod
    def list_for_user(role: str, user_id: str, unread_only: bool = False, limit: int = 50):
        return _serialize_times(
            NotificationModel.list_for(role, user_id, unread_only=unread_only, limit=limit)
        )

    @staticmethod
    def unread_count_for_user(role: str, user_id: str) -> int:
        return NotificationModel.count_unread_for(role, user_id)

    @staticmethod
    def mark_read_for_user(notification_id: str, role: str, user_id: str) -> int:
        return NotificationModel.mark_read_for(notification_id, role, user_id)

    @staticmethod
    def mark_all_read_for_user(role: str, user_id: str) -> int:
        return NotificationModel.mark_all_read_for(role, user_id)

    # ── Read-side (beekeeper only — kept for existing callers) ──
    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, unread_only: bool = False, limit: int = 50):
        return _serialize_times(
            NotificationModel.list_for_beekeeper(
                beekeeper_id, unread_only=unread_only, limit=limit
            )
        )

    @staticmethod
    def unread_count(beekeeper_id: str) -> int:
        return NotificationModel.count_unread(beekeeper_id)

    @staticmethod
    def mark_read(notification_id: str, beekeeper_id: str) -> int:
        return NotificationModel.mark_read(notification_id, beekeeper_id)

    @staticmethod
    def mark_all_read(beekeeper_id: str) -> int:
        return NotificationModel.mark_all_read(beekeeper_id)