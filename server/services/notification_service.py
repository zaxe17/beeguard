"""
Notification fan-out service.

Only the queen-recommendation path is wired now (PEWS is deferred
per the finalization decision). Adding more producers later is a
matter of another classmethod that assembles title/message/type and
calls _persist().
"""
from models.notification import NotificationModel


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
            "notification_type":  "queen_recommendation",
        })

    # ── Read-side ─────────────────────────────
    @staticmethod
    def list_for_beekeeper(beekeeper_id: str, unread_only: bool = False, limit: int = 50):
        return NotificationModel.list_for_beekeeper(
            beekeeper_id, unread_only=unread_only, limit=limit
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