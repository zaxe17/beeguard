"""
Per-role / per-entity sequential ID generator with prefix and
gap-filling reuse.

USER roles (unchanged behaviour — kept fully backwards-compatible):
    citizen   -> CTZ-000001
    beekeeper -> BKP-000001
    admin     -> ADM-000001

Entity IDs (added in migration 002):
    hive           -> HV-000001
    yield          -> YLD-000001
    recommendation -> REC-000001

Entity IDs (added in migration 003):
    alert            -> ALT-000001
    alert_recipient  -> ARC-000001

Gap-filling for USER roles: if a user is hard-deleted, their numeric
ID becomes free again (existing behaviour).

Entity IDs (hive/yield/recommendation/alert/alert_recipient) use a
strictly monotonic counter — no gap search, since these tables can
grow into thousands of rows and a `MIN(free number)` scan gets
expensive. The `user_id_sequence.next_value` row for each entity IS
the source of truth.

Every write is done inside the caller's transaction with
`SELECT ... FOR UPDATE` so concurrent inserts can't collide.
"""
from config.database import Database


ID_WIDTH = 6

ROLE_PREFIX = {
    "citizen":         "CTZ",
    "beekeeper":       "BKP",
    "admin":           "ADM",
    "hive":            "HV",
    "yield":           "YLD",
    "recommendation":  "REC",
    "alert":           "ALT",
    "alert_recipient": "ARC",
}

# Only USER roles participate in gap-fill reuse.
ROLE_TABLES = {
    "citizen":   ("citizens",   "citizenID"),
    "beekeeper": ("beekeepers", "beekeeperID"),
    "admin":     ("admins",     "adminID"),
}

USER_ROLES   = set(ROLE_TABLES.keys())
ENTITY_KEYS  = {"hive", "yield", "recommendation", "alert", "alert_recipient"}
ALLOWED_ROLES = USER_ROLES | ENTITY_KEYS


def _format(role: str, n: int) -> str:
    prefix = ROLE_PREFIX.get(role)
    if not prefix:
        raise ValueError(f"Unknown role for ID generation: {role!r}")
    return f"{prefix}-{n:0{ID_WIDTH}d}"


# ─────────────────────────────────────────────
# USER-ROLE gap-fill (unchanged public behaviour)
# ─────────────────────────────────────────────
def _find_next_free(cur, role: str) -> int:
    table, id_col = ROLE_TABLES[role]
    prefix_len = len(ROLE_PREFIX[role]) + 2   # e.g. "CTZ-" cut point

    cur.execute(f"""
        SELECT MIN(candidate.n) AS next_id
        FROM (
            SELECT 1 AS n
            UNION
            SELECT CAST(SUBSTRING({id_col}, {prefix_len}) AS UNSIGNED) + 1
            FROM {table}
        ) candidate
        LEFT JOIN (
            SELECT CAST(SUBSTRING({id_col}, {prefix_len}) AS UNSIGNED) AS n
            FROM {table}
        ) used ON candidate.n = used.n
        WHERE used.n IS NULL
    """)
    row = cur.fetchone()
    next_n = row["next_id"] if isinstance(row, dict) else (row[0] if row else None)
    return int(next_n) if next_n else 1


def _next_user_sequence_value(conn, role: str) -> int:
    if role not in USER_ROLES:
        raise ValueError(f"_next_user_sequence_value only for user roles, got {role!r}")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT next_value FROM user_id_sequence WHERE role = %s FOR UPDATE",
            (role,),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                "INSERT INTO user_id_sequence (role, next_value) VALUES (%s, 1)",
                (role,),
            )
            cur.execute(
                "SELECT next_value FROM user_id_sequence WHERE role = %s FOR UPDATE",
                (role,),
            )

        next_n = _find_next_free(cur, role)
        cur.execute(
            "UPDATE user_id_sequence SET next_value = %s WHERE role = %s",
            (next_n + 1, role),
        )
        return next_n


# ─────────────────────────────────────────────
# ENTITY (hive/yield/recommendation/alert/alert_recipient) — strict monotonic
# ─────────────────────────────────────────────
def _next_entity_sequence_value(conn, key: str) -> int:
    if key not in ENTITY_KEYS:
        raise ValueError(f"_next_entity_sequence_value only for entity keys, got {key!r}")

    with conn.cursor() as cur:
        cur.execute(
            "SELECT next_value FROM user_id_sequence WHERE role = %s FOR UPDATE",
            (key,),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                "INSERT INTO user_id_sequence (role, next_value) VALUES (%s, 1)",
                (key,),
            )
            next_n = 1
        else:
            next_n = row["next_value"] if isinstance(row, dict) else row[0]
            next_n = int(next_n)

        cur.execute(
            "UPDATE user_id_sequence SET next_value = %s WHERE role = %s",
            (next_n + 1, key),
        )
        return next_n


# ─────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────
def next_user_id(conn, role: str) -> str:
    """Reserve and return the next USER id (CTZ/BKP/ADM-…) on `conn`.
    Caller must commit."""
    return _format(role, _next_user_sequence_value(conn, role))


def next_entity_id(conn, key: str) -> str:
    """Reserve and return the next ENTITY id (HV/YLD/REC/ALT/ARC-…) on `conn`.
    Caller must commit."""
    return _format(key, _next_entity_sequence_value(conn, key))


# Convenience wrappers — mirror the naming used at the model layer
def next_hive_id(conn) -> str:              return next_entity_id(conn, "hive")
def next_yield_id(conn) -> str:             return next_entity_id(conn, "yield")
def next_recommendation_id(conn) -> str:    return next_entity_id(conn, "recommendation")
def next_alert_id(conn) -> str:             return next_entity_id(conn, "alert")
def next_alert_recipient_id(conn) -> str:   return next_entity_id(conn, "alert_recipient")


def sync_next_value(role: str) -> int:
    """Recompute the smallest-free number for a USER role right now."""
    if role not in USER_ROLES:
        # No-op for entity keys — they don't gap-fill.
        return 0

    conn = Database.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT next_value FROM user_id_sequence WHERE role = %s FOR UPDATE",
                (role,),
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO user_id_sequence (role, next_value) VALUES (%s, 1)",
                    (role,),
                )
            next_n = _find_next_free(cur, role)
            cur.execute(
                "UPDATE user_id_sequence SET next_value = %s WHERE role = %s",
                (next_n, role),
            )
        conn.commit()
        return next_n
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def peek_next_user_id(role: str) -> str:
    if role not in USER_ROLES:
        raise ValueError(f"peek_next_user_id only for user roles, got {role!r}")

    table, id_col = ROLE_TABLES[role]
    prefix_len = len(ROLE_PREFIX[role]) + 2
    row = Database.execute(
        f"""
        SELECT MIN(candidate.n) AS next_id
        FROM (
            SELECT 1 AS n
            UNION
            SELECT CAST(SUBSTRING({id_col}, {prefix_len}) AS UNSIGNED) + 1
            FROM {table}
        ) candidate
        LEFT JOIN (
            SELECT CAST(SUBSTRING({id_col}, {prefix_len}) AS UNSIGNED) AS n
            FROM {table}
        ) used ON candidate.n = used.n
        WHERE used.n IS NULL
        """,
        fetchone=True,
    )
    next_n = row["next_id"] if row else None
    return _format(role, int(next_n) if next_n else 1)