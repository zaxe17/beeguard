# services/admin_service.py
#
# Admin side: dashboard numbers, the Users list / details, account
# activation, and the full list of citizen bee reports. Verification
# review itself is in services/verification_service.py.
#
# UPDATED — only REAL accounts are shown and counted: someone who signed
# up but never entered the OTP from their email (email_verified = FALSE)
# is not an account yet, so they don't appear in the Users list, the
# user details, the dashboard/profile counts, or the "new this month"
# numbers. (Every citizens/beekeepers query here uses
# "deleted_at IS NULL AND email_verified = TRUE".)

import datetime as dt
from decimal import Decimal

from config.database import Database

VALID_ROLES = ("citizen", "beekeeper")
VALID_ACCOUNT_STATUSES = ("Active", "Inactive")

_TABLE = {"citizen": "citizens", "beekeeper": "beekeepers"}
_ID_COL = {"citizen": "citizenID", "beekeeper": "beekeeperID"}

# Reports Overview starts here (the month BeeGuard started taking reports)
# and runs to the present. Change this date if you need a different start.
OVERVIEW_START = dt.date(2026, 9, 1)
# Once it's been running longer than this, only the latest months are shown.
OVERVIEW_MAX_MONTHS = 12

# Reports Overview chart lines: (key, legend label, DB statuses).
OVERVIEW_SERIES = [
    ("pending", "Pending", ("Pending",)),
    ("in-progress", "In Progress", ("In Progress",)),
    ("resolved", "Resolved", ("Resolved",)),
    # Cancelled by the citizen (old "False Alarm" rows counted here too).
    ("cancelled", "Cancelled", ("Cancelled", "False Alarm")),
]


def _clean(value):
    """datetime -> ISO string, Decimal -> float (Flask can't JSON these nicely)."""
    if isinstance(value, (dt.date, dt.datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _clean_row(row: dict | None) -> dict | None:
    if row is None:
        return None
    return {k: _clean(v) for k, v in row.items() if k != "password"}


def _count(sql: str, params: tuple = ()) -> int:
    row = Database.execute(sql, params, fetchone=True) or {}
    return int(row.get("c", 0) or 0)


def _add_months(d: dt.date, n: int) -> dt.date:
    """First day of the month `n` months away from d's month."""
    idx = d.year * 12 + (d.month - 1) + n
    return dt.date(idx // 12, idx % 12 + 1, 1)


def _overview_buckets(today: dt.date) -> list[tuple[str, dt.date, dt.date]]:
    """
    X-axis of the Reports Overview as (label, start, end) with end exclusive.
    - Still in the first month (e.g. only September so far): one point per
      week ("Sep 1-7", "Sep 8-14", ... up to today), so there's a real line
      instead of a single dot.
    - After that: one point per month from OVERVIEW_START to this month
      ("Sep", "Oct", ...), at most OVERVIEW_MAX_MONTHS.
    """
    start = OVERVIEW_START.replace(day=1)
    this_month = today.replace(day=1)
    if this_month < start:  # clock before the start date — just show this month
        start = this_month
    # Keep only the latest OVERVIEW_MAX_MONTHS months.
    earliest = _add_months(this_month, -(OVERVIEW_MAX_MONTHS - 1))
    if start < earliest:
        start = earliest

    if start == this_month:
        buckets = []
        day = this_month
        tomorrow = today + dt.timedelta(days=1)
        while day < tomorrow:
            end = min(day + dt.timedelta(days=7), _add_months(this_month, 1))
            last = min(end, tomorrow) - dt.timedelta(days=1)
            label = (
                f"{day.strftime('%b')} {day.day}"
                if last == day
                else f"{day.strftime('%b')} {day.day}-{last.day}"
            )
            buckets.append((label, day, end))
            day = end
        return buckets

    months = []
    m = start
    while m <= this_month:
        months.append(m)
        m = _add_months(m, 1)
    multi_year = months[0].year != months[-1].year
    fmt = "%b %Y" if multi_year else "%b"
    return [(m.strftime(fmt), m, _add_months(m, 1)) for m in months]


def _month_ranges(today: dt.date):
    """
    Returns four [start, end) date ranges:
      mtd             – 1st of this month .. tomorrow
      last_mtd        – 1st of last month .. the same day of last month
                        (so the 3rd of Oct is compared with Sep 1–3, not all of Sep)
      month_full      – the whole of this month
      last_month_full – the whole of last month
    """
    this_start = _add_months(today, 0)
    last_start = _add_months(today, -1)
    next_start = _add_months(today, 1)
    days_in_last = (this_start - last_start).days
    same_day = min(today.day, days_in_last)

    mtd = (this_start, today + dt.timedelta(days=1))
    last_mtd = (last_start, last_start + dt.timedelta(days=same_day))
    return mtd, last_mtd, (this_start, next_start), (last_start, this_start)


# Only fixed table/column names from this file are put into the SQL.
_RANGE_COLUMNS = {
    ("citizens", "created_at"),
    ("beekeepers", "created_at"),
    ("reports", "reported_at"),
    ("alerts", "scheduled_date"),
}


def _count_between(table: str, column: str, start: dt.date, end: dt.date,
                   extra_where: str = "") -> int:
    if (table, column) not in _RANGE_COLUMNS:
        raise ValueError("Unsupported table/column.")
    extra = f" AND {extra_where}" if extra_where else ""
    return _count(
        f"SELECT COUNT(*) AS c FROM {table} "
        f"WHERE {column} >= %s AND {column} < %s{extra}",
        (start, end),
    )


def _change(this_month: int, last_month: int) -> dict:
    """
    Month-over-month change for a dashboard card.
    percent is None when last month was 0 (a percentage would be meaningless);
    the card then shows "+N new this month" instead.
    """
    if this_month > last_month:
        direction = "up"
    elif this_month < last_month:
        direction = "down"
    else:
        direction = "same"
    percent = (
        round(abs(this_month - last_month) / last_month * 100)
        if last_month > 0 else None
    )
    return {
        "this_month": this_month,
        "last_month": last_month,
        "percent": percent,
        "direction": direction,
    }


class AdminService:

    # ── DASHBOARD ─────────────────────────────
    @staticmethod
    def dashboard() -> dict:
        counts = {
            "citizens": _count(
                "SELECT COUNT(*) AS c FROM citizens WHERE deleted_at IS NULL AND email_verified = TRUE"
            ),
            "beekeepers": _count(
                "SELECT COUNT(*) AS c FROM beekeepers WHERE deleted_at IS NULL AND email_verified = TRUE"
            ),
            "reports": _count("SELECT COUNT(*) AS c FROM reports"),
            # Approved alerts scheduled for today or later.
            "active_alerts": _count(
                "SELECT COUNT(*) AS c FROM alerts "
                "WHERE scheduled_date >= CURDATE() AND approval_status = 'Approved'"
            ),
            # Beekeeper-reported alerts waiting for admin approval.
            "pending_alerts": _count(
                "SELECT COUNT(*) AS c FROM alerts WHERE approval_status = 'Pending'"
            ),
            "pending_verifications": _count(
                "SELECT COUNT(*) AS c FROM beekeepers "
                "WHERE deleted_at IS NULL AND email_verified = TRUE AND verification_status = 'Pending'"
            ),
        }

        # "▲ 8% This Month" under each card — real month-over-month numbers.
        mtd, last_mtd, month_full, last_month_full = _month_ranges(dt.date.today())
        changes = {
            # New sign-ups: this month so far vs the same days of last month.
            "citizens": _change(
                _count_between("citizens", "created_at", *mtd, "deleted_at IS NULL AND email_verified = TRUE"),
                _count_between("citizens", "created_at", *last_mtd, "deleted_at IS NULL AND email_verified = TRUE"),
            ),
            "beekeepers": _change(
                _count_between("beekeepers", "created_at", *mtd, "deleted_at IS NULL AND email_verified = TRUE"),
                _count_between("beekeepers", "created_at", *last_mtd, "deleted_at IS NULL AND email_verified = TRUE"),
            ),
            # Reports sent: this month so far vs the same days of last month.
            "reports": _change(
                _count_between("reports", "reported_at", *mtd),
                _count_between("reports", "reported_at", *last_mtd),
            ),
            # Alerts are scheduled ahead, so compare whole calendar months.
            "active_alerts": _change(
                _count_between("alerts", "scheduled_date", *month_full,
                               "approval_status = 'Approved'"),
                _count_between("alerts", "scheduled_date", *last_month_full,
                               "approval_status = 'Approved'"),
            ),
        }

        # Reports Overview: September 2026 (OVERVIEW_START) to the present.
        buckets = _overview_buckets(dt.date.today())

        # One line per status: Pending, In Progress, Resolved, Cancelled.
        rows = Database.execute(
            """
            SELECT DATE(reported_at) AS d, status, COUNT(*) AS c
            FROM reports
            WHERE reported_at >= %s AND reported_at < %s
            GROUP BY DATE(reported_at), status
            """,
            (buckets[0][1], buckets[-1][2]),
            fetchall=True,
        ) or []

        per_status = {key: [0] * len(buckets) for key, _l, _s in OVERVIEW_SERIES}
        for r in rows:
            day = r["d"]
            if isinstance(day, dt.datetime):
                day = day.date()
            idx = next(
                (i for i, (_lbl, start, end) in enumerate(buckets) if start <= day < end),
                None,
            )
            if idx is None:
                continue
            for key, _label, statuses in OVERVIEW_SERIES:
                if r["status"] in statuses:
                    per_status[key][idx] += int(r["c"])

        series = [
            {"key": key, "label": label, "data": per_status[key]}
            for key, label, _statuses in OVERVIEW_SERIES
        ]
        totals = [sum(s["data"][i] for s in series) for i in range(len(buckets))]

        recent = Database.execute(
            """
            SELECT r.reportID, r.status, r.image_url, r.ai_species_identified,
                   r.latitude, r.longitude, r.sighted_at, r.reported_at,
                   c.name AS citizen_name
            FROM reports r
            JOIN citizens c ON c.citizenID = r.citizenID
            ORDER BY r.reported_at DESC
            LIMIT 5
            """,
            (),
            fetchall=True,
        ) or []

        return {
            "counts": counts,
            "changes": changes,
            "reports_overview": {
                "categories": [label for label, _start, _end in buckets],
                "series": series,
                "data": totals,  # all 4 statuses added together
            },
            "recent_reports": [_clean_row(r) for r in recent],
        }

    # ── USERS LIST ────────────────────────────
    @staticmethod
    def list_users(role: str | None = None, search: str | None = None,
                   limit: int = 300) -> dict:
        like = f"%{search.strip()}%" if search and search.strip() else None
        search_sql = (
            " AND (name LIKE %s OR email LIKE %s OR username LIKE %s OR contact_no LIKE %s)"
            if like else ""
        )
        search_params = (like, like, like, like) if like else ()

        parts, params = [], []
        if role in (None, "", "all", "citizen"):
            parts.append(f"""
                SELECT citizenID AS id, 'citizen' AS role, name, username, email,
                       contact_no, address, status, NULL AS verification_status,
                       NULL AS farm_name, created_at, profile_photo
                FROM citizens
                WHERE deleted_at IS NULL AND email_verified = TRUE{search_sql}
            """)
            params.extend(search_params)
        if role in (None, "", "all", "beekeeper", "verification"):
            extra = " AND verification_status = 'Pending'" if role == "verification" else ""
            parts.append(f"""
                SELECT beekeeperID AS id, 'beekeeper' AS role, name, username, email,
                       contact_no, address, status, verification_status,
                       farm_name, created_at, profile_photo
                FROM beekeepers
                WHERE deleted_at IS NULL AND email_verified = TRUE{extra}{search_sql}
            """)
            params.extend(search_params)

        rows = []
        if parts:
            sql = " UNION ALL ".join(parts) + " ORDER BY created_at DESC LIMIT %s"
            params.append(int(limit))
            rows = Database.execute(sql, tuple(params), fetchall=True) or []

        counts = {
            "citizens": _count("SELECT COUNT(*) AS c FROM citizens WHERE deleted_at IS NULL AND email_verified = TRUE"),
            "beekeepers": _count("SELECT COUNT(*) AS c FROM beekeepers WHERE deleted_at IS NULL AND email_verified = TRUE"),
            "pending_verifications": _count(
                "SELECT COUNT(*) AS c FROM beekeepers "
                "WHERE deleted_at IS NULL AND email_verified = TRUE AND verification_status = 'Pending'"
            ),
        }
        counts["all"] = counts["citizens"] + counts["beekeepers"]

        users = [_clean_row(r) for r in rows]
        for u in users:  # file name -> URL path (Migration 019)
            u["profile_photo"] = (
                f"/uploads/profile/{u['profile_photo']}" if u.get("profile_photo") else None
            )
        return {"users": users, "counts": counts}

    # ── USER DETAILS ──────────────────────────
    @staticmethod
    def get_user(role: str, user_id: str) -> dict:
        if role not in VALID_ROLES:
            raise ValueError("Invalid role.")

        row = Database.execute(
            f"SELECT * FROM {_TABLE[role]} WHERE {_ID_COL[role]} = %s AND deleted_at IS NULL AND email_verified = TRUE LIMIT 1",
            (user_id,),
            fetchone=True,
        )
        if not row:
            raise LookupError("User not found.")

        user = _clean_row(row)
        user["id"] = user_id
        user["role"] = role
        # The actual file path is never sent — only whether one exists.
        if role == "beekeeper":
            user["has_verification_document"] = bool(user.pop("verification_document_url", None))

        result = {"user": user, "hives": [], "activity": []}

        if role == "citizen":
            reports = Database.execute(
                """
                SELECT reportID, status, image_url, ai_species_identified, latitude,
                       longitude, bee_danger, description, sighted_at, reported_at
                FROM reports
                WHERE citizenID = %s
                ORDER BY reported_at DESC
                LIMIT 100
                """,
                (user_id,),
                fetchall=True,
            ) or []
            result["activity"] = [_clean_row(r) for r in reports]
        else:
            hives = Database.execute(
                """
                SELECT h.hive_id, h.hive_name, h.bee_species, h.health_status,
                       h.hive_state, h.date_established,
                       (SELECT MAX(activity_date) FROM hives_maintenance hm
                         WHERE hm.hive_id = h.hive_id) AS last_check,
                       (SELECT COALESCE(SUM(yield_kg), 0) FROM yields y
                         WHERE y.hive_id = h.hive_id
                           AND YEAR(y.yield_date) = YEAR(CURDATE())
                           AND MONTH(y.yield_date) = MONTH(CURDATE())) AS yield_this_month
                FROM hives h
                WHERE h.beekeeper_id = %s
                ORDER BY h.created_at DESC
                """,
                (user_id,),
                fetchall=True,
            ) or []
            result["hives"] = [_clean_row(h) for h in hives]

            offers = Database.execute(
                """
                SELECT ro.offer_id, ro.offered_fee, ro.offer_status, ro.created_at,
                       r.reportID, r.status, r.image_url, r.latitude, r.longitude,
                       r.sighted_at, r.reported_at, c.name AS citizen_name
                FROM rescue_offers ro
                JOIN reports r ON r.reportID = ro.report_id
                JOIN citizens c ON c.citizenID = r.citizenID
                WHERE ro.beekeeperID = %s
                ORDER BY ro.created_at DESC
                LIMIT 100
                """,
                (user_id,),
                fetchall=True,
            ) or []
            result["activity"] = [_clean_row(o) for o in offers]

        return result

    # ── ACTIVATE / DEACTIVATE ─────────────────
    @staticmethod
    def set_status(role: str, user_id: str, status: str) -> dict:
        if role not in VALID_ROLES:
            raise ValueError("Invalid role.")
        if status not in VALID_ACCOUNT_STATUSES:
            raise ValueError("Status must be Active or Inactive.")
        exists = Database.execute(
            f"SELECT 1 FROM {_TABLE[role]} WHERE {_ID_COL[role]} = %s AND deleted_at IS NULL AND email_verified = TRUE LIMIT 1",
            (user_id,),
            fetchone=True,
        )
        if not exists:
            raise LookupError("User not found.")
        Database.execute(
            f"UPDATE {_TABLE[role]} SET status = %s WHERE {_ID_COL[role]} = %s",
            (status, user_id),
            commit=True,
        )
        # Inactive users can't log in (AuthService.login checks status).
        return {"id": user_id, "role": role, "status": status}

    # ── ALL CITIZEN REPORTS ───────────────────
    @staticmethod
    def list_reports(status: str | None = None, limit: int = 300) -> list[dict]:
        where, params = "", []
        if status and status.lower() != "all":
            where = "WHERE r.status = %s"
            params.append(status)
        params.append(int(limit))
        rows = Database.execute(
            f"""
            SELECT r.reportID, r.status, r.image_url, r.ai_species_identified,
                   r.latitude, r.longitude, r.bee_danger, r.description,
                   r.sighted_at, r.reported_at, r.resolved_at,
                   c.name AS citizen_name
            FROM reports r
            JOIN citizens c ON c.citizenID = r.citizenID
            {where}
            ORDER BY r.reported_at DESC
            LIMIT %s
            """,
            tuple(params),
            fetchall=True,
        ) or []
        return [_clean_row(r) for r in rows]

    # ── ONE REPORT (details popup) ────────────
    @staticmethod
    def get_report(report_id: str) -> dict:
        """
        Everything the admin sees when tapping a report: the report, the
        citizen who sent it, and every beekeeper offer on it (with the
        citizen's rating, once the rescue is resolved and rated).
        """
        report = Database.execute(
            """
            SELECT r.reportID, r.status, r.image_url, r.ai_species_identified,
                   r.latitude, r.longitude, r.bee_danger, r.description,
                   r.sighted_at, r.reported_at, r.resolved_at, r.cancelled_at,
                   r.payment_status, r.payment_method,
                   c.citizenID, c.name AS citizen_name, c.email AS citizen_email,
                   c.contact_no AS citizen_contact
            FROM reports r
            JOIN citizens c ON c.citizenID = r.citizenID
            WHERE r.reportID = %s
            LIMIT 1
            """,
            (report_id,),
            fetchone=True,
        )
        if not report:
            raise LookupError("Report not found.")

        offers = Database.execute(
            """
            SELECT ro.offer_id, ro.offered_fee, ro.offer_status,
                   ro.created_at, ro.resolved_at,
                   b.beekeeperID, b.name AS beekeeper_name, b.farm_name,
                   b.contact_no AS beekeeper_contact,
                   rt.rating_value, rt.comment AS rating_comment
            FROM rescue_offers ro
            JOIN beekeepers b ON b.beekeeperID = ro.beekeeperID
            LEFT JOIN ratings rt ON rt.offer_id = ro.offer_id
            WHERE ro.report_id = %s
            ORDER BY FIELD(ro.offer_status, 'Accepted', 'Resolved', 'Pending', 'Rejected'),
                     ro.created_at ASC
            """,
            (report_id,),
            fetchall=True,
        ) or []

        return {
            "report": _clean_row(report),
            "offers": [_clean_row(o) for o in offers],
        }