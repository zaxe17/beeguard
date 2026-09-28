# models/chat_report.py

from config.database import Database
from utils.id_generator import next_chat_report_id


class ChatReportModel:
    TABLE = "chat_reports"

    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """data: chat_id, reporter_role ('Citizen'|'Beekeeper'), reporter_id, category, details"""
        report_id = next_chat_report_id(conn)
        sql = f"""
            INSERT INTO {ChatReportModel.TABLE}
                (chat_report_id, chat_id, reporter_role, reporter_id, category, details)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                report_id,
                data["chat_id"],
                data["reporter_role"],
                data["reporter_id"],
                data["category"],
                data.get("details"),
            ))
        return report_id

    @staticmethod
    def list_for_chat(chat_id: int):
        sql = f"""
            SELECT * FROM {ChatReportModel.TABLE}
            WHERE chat_id = %s
            ORDER BY created_at DESC
        """
        return Database.execute(sql, (chat_id,), fetchall=True) or []
