# models/chat.py
#
# One `chats` row per (citizen, beekeeper) pair. chat_id is a plain
# AUTO_INCREMENT int per the schema — no id_generator involvement.

from config.database import Database


def _unread_col(role: str) -> str:
    # Migration 010 — each side has its own "Mark as unread" flag.
    return "citizen_marked_unread" if role == "citizen" else "beekeeper_marked_unread"


class ChatModel:
    TABLE = "chats"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(chat_id: int):
        sql = f"SELECT * FROM {ChatModel.TABLE} WHERE chat_id = %s LIMIT 1"
        return Database.execute(sql, (chat_id,), fetchone=True)

    @staticmethod
    def find_by_pair(citizen_id: str, beekeeper_id: str, conn=None):
        sql = f"""
            SELECT * FROM {ChatModel.TABLE}
            WHERE citizenID = %s AND beekeeperID = %s
            LIMIT 1
        """
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(sql, (citizen_id, beekeeper_id))
                return cur.fetchone()
        return Database.execute(sql, (citizen_id, beekeeper_id), fetchone=True)

    @staticmethod
    def is_participant(chat_id: int, role: str, user_id: str) -> bool:
        col = "citizenID" if role == "citizen" else "beekeeperID"
        sql = f"SELECT 1 FROM {ChatModel.TABLE} WHERE chat_id = %s AND {col} = %s LIMIT 1"
        return Database.execute(sql, (chat_id, user_id), fetchone=True) is not None

    # NOTE: `profile_photo` is the column that holds the profile picture
    # path ("/uploads/profile/..."). If your column has another name, change
    # it in the two queries below (bk.profile_photo / cz.profile_photo).
    @staticmethod
    def list_for_citizen(citizen_id: str):
        sql = f"""
            SELECT c.*, bk.name AS other_name, bk.address AS other_location,
                   bk.profile_photo AS other_photo
            FROM {ChatModel.TABLE} c
            JOIN beekeepers bk ON bk.beekeeperID = c.beekeeperID
            WHERE c.citizenID = %s
            ORDER BY c.created_at DESC
        """
        return Database.execute(sql, (citizen_id,), fetchall=True) or []

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str):
        sql = f"""
            SELECT c.*, cz.name AS other_name, cz.address AS other_location,
                   cz.profile_photo AS other_photo
            FROM {ChatModel.TABLE} c
            JOIN citizens cz ON cz.citizenID = c.citizenID
            WHERE c.beekeeperID = %s
            ORDER BY c.created_at DESC
        """
        return Database.execute(sql, (beekeeper_id,), fetchall=True) or []

    @staticmethod
    def is_marked_unread(row: dict, role: str) -> bool:
        return bool(row.get(_unread_col(role)))

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def find_or_create(citizen_id: str, beekeeper_id: str) -> int:
        """Atomic get-or-create for one (citizen, beekeeper) pair."""
        conn = Database.get_connection()
        try:
            existing = ChatModel.find_by_pair(citizen_id, beekeeper_id, conn=conn)
            if existing:
                conn.commit()
                return existing["chat_id"]
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {ChatModel.TABLE} (citizenID, beekeeperID) VALUES (%s, %s)",
                    (citizen_id, beekeeper_id),
                )
                chat_id = cur.lastrowid
            conn.commit()
            return chat_id
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def set_marked_unread(chat_id: int, role: str, value: bool) -> int:
        col = _unread_col(role)
        sql = f"UPDATE {ChatModel.TABLE} SET {col} = %s WHERE chat_id = %s"
        return Database.execute(sql, (bool(value), chat_id), commit=True)

    @staticmethod
    def delete(chat_id: int) -> int:
        """
        Hard-deletes the chat and its messages. Messages are removed
        explicitly first rather than relying on an ON DELETE CASCADE
        (not verified to exist on your `messages` table's FK) —
        correct either way. chat_reports referencing this chat_id IS
        covered by an explicit ON DELETE CASCADE (migration 007), so
        no separate cleanup needed there.
        """
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM messages WHERE chat_id = %s", (chat_id,))
                cur.execute(f"DELETE FROM {ChatModel.TABLE} WHERE chat_id = %s", (chat_id,))
                rowcount = cur.rowcount
            conn.commit()
            return rowcount
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()