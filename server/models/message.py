# models/message.py
#
# messages.sender_role identifies WHICH side of the chat sent a
# message ('Citizen' | 'Beekeeper') — chats has exactly one citizen
# and one beekeeper, so role is sufficient identity; there is no
# separate sender-id column in the schema.
#
# Location messages (migration 009): message_type = 'location' with
# latitude/longitude. A LIVE share also has live_until; the sender
# keeps updating the coordinates until then.
#
# Photo messages (migration 010): message_type = 'image' with
# image_url = the saved file name under uploads/chat/.

from config.database import Database


# Computed in SQL (not Python) so the "is it still live?" check uses
# the DB clock on both sides — no server/DB timezone mismatch.
LOCATION_COLUMNS = """
    (live_until IS NOT NULL AND live_until > NOW())        AS is_live,
    GREATEST(TIMESTAMPDIFF(SECOND, NOW(), live_until), 0)  AS live_seconds_left,
    TIMESTAMPDIFF(SECOND, location_updated_at, NOW())      AS location_age_seconds
"""


class MessageModel:
    TABLE = "messages"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(message_id: int):
        sql = f"""
            SELECT *, {LOCATION_COLUMNS}
            FROM {MessageModel.TABLE}
            WHERE message_id = %s
            LIMIT 1
        """
        return Database.execute(sql, (message_id,), fetchone=True)

    @staticmethod
    def list_by_chat(chat_id: int, limit: int = 200, before_id: int | None = None):
        """
        The NEWEST `limit` messages (optionally only those older than
        `before_id`), returned oldest -> newest for display.

        FIX: this used to take the OLDEST 200 (ORDER BY ... ASC LIMIT
        200), so once a chat passed 200 messages the new ones never
        showed. It now takes the newest ones, and `before_id` loads older
        messages page by page ("load older" when scrolling up).
        """
        where = "chat_id = %s"
        params: list = [chat_id]
        if before_id is not None:
            where += " AND message_id < %s"
            params.append(int(before_id))
        params.append(int(limit))
        sql = f"""
            SELECT *, {LOCATION_COLUMNS}
            FROM {MessageModel.TABLE}
            WHERE {where}
            ORDER BY message_id DESC
            LIMIT %s
        """
        rows = Database.execute(sql, tuple(params), fetchall=True) or []
        rows.reverse()  # oldest -> newest
        return rows

    @staticmethod
    def latest_for_chat(chat_id: int):
        sql = f"""
            SELECT * FROM {MessageModel.TABLE}
            WHERE chat_id = %s
            ORDER BY sent_at DESC, message_id DESC
            LIMIT 1
        """
        return Database.execute(sql, (chat_id,), fetchone=True)

    @staticmethod
    def count_unread_for_role(chat_id: int, reader_role: str) -> int:
        """Unread messages waiting for `reader_role` — i.e. sent by the OTHER side."""
        other_role = "Beekeeper" if reader_role == "citizen" else "Citizen"
        sql = f"""
            SELECT COUNT(*) AS c FROM {MessageModel.TABLE}
            WHERE chat_id = %s AND sender_role = %s AND is_read = FALSE
        """
        row = Database.execute(sql, (chat_id, other_role), fetchone=True) or {}
        return int(row.get("c", 0) or 0)

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert(chat_id: int, sender_role: str, content: str) -> int:
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    INSERT INTO {MessageModel.TABLE}
                        (chat_id, sender_role, message_content)
                    VALUES (%s, %s, %s)
                    """,
                    (chat_id, sender_role, content),
                )
                message_id = cur.lastrowid
            conn.commit()
            return message_id
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def insert_location(
        chat_id: int,
        sender_role: str,
        latitude: float,
        longitude: float,
        live_minutes: int,
    ) -> int:
        """
        live_minutes = 0  -> one-time pin (live_until stays NULL).
        live_minutes > 0  -> live share; any OTHER live share this sender
                             still has running in this chat is ended first,
                             so there is only ever one live pin per person.
        """
        is_live = int(live_minutes) > 0
        content = "Shared a live location" if is_live else "Shared a location"

        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                if is_live:
                    cur.execute(
                        f"""
                        UPDATE {MessageModel.TABLE}
                        SET live_until = NOW()
                        WHERE chat_id = %s
                          AND sender_role = %s
                          AND message_type = 'location'
                          AND live_until > NOW()
                        """,
                        (chat_id, sender_role),
                    )
                    cur.execute(
                        f"""
                        INSERT INTO {MessageModel.TABLE}
                            (chat_id, sender_role, message_type, message_content,
                             latitude, longitude, live_until, location_updated_at)
                        VALUES (%s, %s, 'location', %s, %s, %s,
                                DATE_ADD(NOW(), INTERVAL %s MINUTE), NOW())
                        """,
                        (chat_id, sender_role, content, latitude, longitude, int(live_minutes)),
                    )
                else:
                    cur.execute(
                        f"""
                        INSERT INTO {MessageModel.TABLE}
                            (chat_id, sender_role, message_type, message_content,
                             latitude, longitude, location_updated_at)
                        VALUES (%s, %s, 'location', %s, %s, %s, NOW())
                        """,
                        (chat_id, sender_role, content, latitude, longitude),
                    )
                message_id = cur.lastrowid
            conn.commit()
            return message_id
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def insert_image(chat_id: int, sender_role: str, filename: str) -> int:
        """Migration 010 — photo message. `filename` is the saved file's name only."""
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    INSERT INTO {MessageModel.TABLE}
                        (chat_id, sender_role, message_type, message_content, image_url)
                    VALUES (%s, %s, 'image', 'Sent a photo', %s)
                    """,
                    (chat_id, sender_role, filename),
                )
                message_id = cur.lastrowid
            conn.commit()
            return message_id
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def update_live_location(message_id: int, sender_role: str, latitude: float, longitude: float) -> int:
        """Moves the pin of a still-running live share. No-op once it has ended."""
        sql = f"""
            UPDATE {MessageModel.TABLE}
            SET latitude = %s, longitude = %s, location_updated_at = NOW()
            WHERE message_id = %s
              AND sender_role = %s
              AND message_type = 'location'
              AND live_until > NOW()
        """
        return Database.execute(sql, (latitude, longitude, message_id, sender_role), commit=True)

    @staticmethod
    def stop_live_location(message_id: int, sender_role: str) -> int:
        sql = f"""
            UPDATE {MessageModel.TABLE}
            SET live_until = NOW()
            WHERE message_id = %s
              AND sender_role = %s
              AND message_type = 'location'
              AND live_until > NOW()
        """
        return Database.execute(sql, (message_id, sender_role), commit=True)

    @staticmethod
    def mark_read_for_role(chat_id: int, reader_role: str) -> int:
        """Marks every message from the OTHER side of `chat_id` as read."""
        other_role = "Beekeeper" if reader_role == "citizen" else "Citizen"
        sql = f"""
            UPDATE {MessageModel.TABLE}
            SET is_read = TRUE
            WHERE chat_id = %s AND sender_role = %s AND is_read = FALSE
        """
        return Database.execute(sql, (chat_id, other_role), commit=True)

    @staticmethod
    def delete(message_id: int, sender_role: str) -> int:
        """Scoped delete — only removes the row if it was sent by `sender_role`."""
        sql = f"""
            DELETE FROM {MessageModel.TABLE}
            WHERE message_id = %s AND sender_role = %s
        """
        return Database.execute(sql, (message_id, sender_role), commit=True)