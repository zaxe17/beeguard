# services/chat_report_service.py

from config.database import Database
from models.chat import ChatModel
from models.chat_report import ChatReportModel

# Matches the categories previously defined in data/reportChatCateg.json
# on the frontend. Exposed here too so the frontend can fetch this list
# from a single source of truth instead of maintaining a duplicate file.
CHAT_REPORT_CATEGORIES = [
    "Spam or scam",
    "Harassment or abusive language",
    "Inappropriate content",
    "Impersonation",
    "Suspicious rescue offer",
    "Other",
]


class ChatReportService:

    @staticmethod
    def create_report(role: str, user_id: str, payload: dict) -> dict:
        chat_id = payload["chat_id"]
        if not ChatModel.is_participant(chat_id, role, user_id):
            raise PermissionError("You are not a participant of this chat.")

        reporter_role = "Citizen" if role == "citizen" else "Beekeeper"

        conn = Database.get_connection()
        try:
            report_id = ChatReportModel.insert_with_conn(conn, {
                "chat_id":       chat_id,
                "reporter_role": reporter_role,
                "reporter_id":   user_id,
                "category":      payload["category"],
                "details":       payload.get("details"),
            })
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return {"chat_report_id": report_id, "chat_id": chat_id, "category": payload["category"]}
