# models/cv_scan.py

from config.database import Database
from utils.id_generator import next_cvscan_id


class CVScanModel:
    TABLE = "cv_scans"

    # ── READ ──────────────────────────────────
    @staticmethod
    def find_by_id(cvscan_id: str):
        sql = f"SELECT * FROM {CVScanModel.TABLE} WHERE cvscan_id = %s LIMIT 1"
        return Database.execute(sql, (cvscan_id,), fetchone=True)

    @staticmethod
    def list_by_citizen(citizen_id: str, limit: int = 50):
        sql = f"""
            SELECT * FROM {CVScanModel.TABLE}
            WHERE citizenID = %s
            ORDER BY scanned_at DESC
            LIMIT %s
        """
        return Database.execute(sql, (citizen_id, int(limit)), fetchall=True) or []

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        """
        data:
          citizen_id (nullable — guest scans per schema),
          image_url, identified_species (nullable — no detection),
          confidence_score (nullable)
        """
        cvscan_id = next_cvscan_id(conn)
        sql = f"""
            INSERT INTO {CVScanModel.TABLE}
                (cvscan_id, citizenID, image_url,
                 identified_species, confidence_score)
            VALUES (%s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                cvscan_id,
                data.get("citizen_id"),
                data["image_url"],
                data.get("identified_species"),
                data.get("confidence_score"),
            ))
        return cvscan_id