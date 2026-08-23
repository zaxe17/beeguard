# hive_maintenance.py

from config.database import Database

# Kept in sync with hive_validator.VALID_INSPECT / hive_service.NORMAL_LABEL.
# Duplicated locally (same pattern already used elsewhere in this codebase)
# to avoid a circular import between the model and service layers.
NORMAL_LABEL = "Normal / Healthy"
REMARKS_PREFIX = "Physical Inspection: "


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

    @staticmethod
    def _parse_observation_labels(remarks: str | None) -> list[str]:
        """
        Reverses the `remarks` string produced by
        record_physical_inspection() back into the list of observation
        labels that were selected in that session, e.g.
          "Physical Inspection: Presence of Queen Cells, Emaciated Queen"
          -> ["Presence of Queen Cells", "Emaciated Queen"]
        Returns [] for rows that aren't Physical Inspection remarks
        (e.g. other maintenance activity types, or malformed/blank data).
        """
        if not remarks or not remarks.startswith(REMARKS_PREFIX):
            return []
        tail = remarks[len(REMARKS_PREFIX):]
        return [p.strip() for p in tail.split(",") if p.strip()]

    @staticmethod
    def list_unresolved_symptoms(hive_id: str) -> list[str]:
        """
        CUMULATIVE symptom tracking across separate monitoring sessions.

        Walks the hive's inspection history newest-first and collects the
        DISTINCT symptom labels reported since the last time the
        beekeeper recorded 'Normal / Healthy'. Walking stops as soon as
        a 'Normal / Healthy' record is hit (that record itself is NOT
        included — it means the hive was confirmed clear as of that
        date, so anything before it no longer counts).

        Examples:
          - No inspection history yet                -> []
          - Most recent inspection was Normal/Healthy -> []
          - History (newest first): [QueenCells]      -> ["Presence of Queen Cells"]
          - History (newest first): [Brood, QueenCells]
              -> ["Reduction of Open Brood", "Presence of Queen Cells"]
          - History (newest first): [QueenCells, Normal/Healthy, Brood]
              -> ["Presence of Queen Cells"]   (stops at Normal/Healthy)
        """
        sql = f"""
            SELECT remarks FROM {HiveMaintenanceModel.TABLE}
            WHERE hive_id = %s AND activity_type = 'Inspection'
            ORDER BY activity_date DESC, created_at DESC
        """
        rows = Database.execute(sql, (hive_id,), fetchall=True) or []

        symptoms: list[str] = []
        for row in rows:
            labels = HiveMaintenanceModel._parse_observation_labels(row.get("remarks"))
            if NORMAL_LABEL in labels:
                # Hive was confirmed clear at this point in history —
                # do not look further back.
                break
            for label in labels:
                if label not in symptoms:
                    symptoms.append(label)
        return symptoms

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
    def record_physical_inspection(conn, hive_id: str, observation_labels: list[str],
                                    activity_date, remarks_prefix: str = "Physical Inspection"):
        """
        Records the modal's Physical Inspection checkboxes into
        hives_maintenance as a single 'Inspection' activity, with ALL
        selected labels joined into one `remarks` string (e.g.
        "Physical Inspection: Presence of Queen Cells, Emaciated Queen")
        — one maintenance row per inspection event, not one per label.

        IMPORTANT: `remarks` here always reflects ONLY what the
        beekeeper actually checked in THIS session, as an honest audit
        trail — it is NOT the cumulative symptom set. Cumulative
        health-status logic lives in list_unresolved_symptoms() /
        HiveService._health_from_observations(), which read history
        back out via _parse_observation_labels().

        Returns the new maintenance_id.
        """
        remarks = f"{remarks_prefix}: {', '.join(observation_labels)}"
        return HiveMaintenanceModel.insert_with_conn(conn, {
            "hive_id":       hive_id,
            "activity_type": "Inspection",
            "remarks":       remarks,
            "activity_date": activity_date,
        })

    @staticmethod
    def record_reset(conn, hive_id: str, activity_date):
        """
        Logs a 'Normal / Healthy' Inspection row on the caller's own
        behalf (not from the MonitorHealth modal) — used by
        QueenService.confirm_replacement() right after a queen
        replacement is confirmed.

        Without this, list_unresolved_symptoms() has no 'Normal /
        Healthy' row to stop at, so the NEXT Physical Inspection would
        walk straight through to symptoms reported BEFORE the
        replacement and merge them with the new ones — pushing the
        hive straight to "Weak" instead of correctly starting fresh at
        "Needs Attention" for the first new symptom after the reset.

        Reuses record_physical_inspection() so the row is written in
        the exact same "Physical Inspection: Normal / Healthy" format
        that list_unresolved_symptoms() already knows how to parse —
        no changes needed there.

        Returns the new maintenance_id.
        """
        return HiveMaintenanceModel.record_physical_inspection(
            conn, hive_id, [NORMAL_LABEL], activity_date,
        )