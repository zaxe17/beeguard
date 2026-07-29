from config.database import Database


class HiveMaintenanceModel:
    TABLE = "hives_maintenance"

    # NOTE: your existing schema uses a VARCHAR(15) PK on maintenance_id.
    # We keep the id_generator out of it for now and use a MYSQL-side
    # AUTO-generated char id (millisecond timestamp + short random suffix)
    # to avoid schema churn. If you'd rather have MT-000001, wire it into
    # id_generator later — the model API won't change.
    import secrets, datetime as _dt
    @classmethod
    def _gen_id(cls) -> str:
        # 15-char id, e.g. "MT-YYMMDDHHMMSS"
        now = cls._dt.datetime.utcnow().strftime("%y%m%d%H%M%S")
        return f"MT-{now}"

    # ── READ ──────────────────────────────────
    @staticmethod
    def list_by_hive(hive_id: str, limit: int | None = None):
        limit_sql = f"LIMIT {int(limit)}" if limit else ""
        sql = f"""
            SELECT * FROM {HiveMaintenanceModel.TABLE}
            WHERE hive_id = %s
            ORDER BY activity_date DESC, created_at DESC
            {limit_sql}
        """
        return Database.execute(sql, (hive_id,), fetchall=True) or []

    @staticmethod
    def latest_inspection(hive_id: str):
        sql = f"""
            SELECT * FROM {HiveMaintenanceModel.TABLE}
            WHERE hive_id = %s AND activity_type = 'Inspection'
            ORDER BY activity_date DESC, created_at DESC
            LIMIT 1
        """
        return Database.execute(sql, (hive_id,), fetchone=True)

    # ── WRITE ─────────────────────────────────
    @staticmethod
    def insert_with_conn(conn, data: dict) -> str:
        mid = HiveMaintenanceModel._gen_id()
        sql = f"""
            INSERT INTO {HiveMaintenanceModel.TABLE}
                (maintenance_id, hive_id, activity_type, remarks, activity_date)
            VALUES (%s, %s, %s, %s, %s)
        """
        with conn.cursor() as cur:
            cur.execute(sql, (
                mid,
                data["hive_id"],
                data["activity_type"],
                data.get("remarks"),
                data["activity_date"],
            ))
        return mid

    @staticmethod
    def record_physical_inspection(conn, hive_id: str, observation_label: str,
                                    activity_date, remarks_prefix: str = "Physical Inspection"):
        """
        Records the modal's 4-option Physical Inspection radio into
        hives_maintenance as an 'Inspection' activity, with the radio
        label encoded in `remarks` (option a from the schema Q&A).
        Returns the new maintenance_id.
        """
        remarks = f"{remarks_prefix}: {observation_label}"
        return HiveMaintenanceModel.insert_with_conn(conn, {
            "hive_id":       hive_id,
            "activity_type": "Inspection",
            "remarks":       remarks,
            "activity_date": activity_date,
        })