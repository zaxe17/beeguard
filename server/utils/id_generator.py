"""
Per-role sequential User ID generator with role prefix and gap-filling reuse.

Format: {PREFIX}-{6-digit zero-padded sequence}
    citizen   -> CTZ-000001, CTZ-000002, ...
    beekeeper -> BKP-000001, BKP-000002, ...  (independent counter)
    admin     -> ADM-000001, ADM-000002, ...  (independent counter)

Gap-filling: if a user is hard-deleted, their numeric ID becomes free
again. The NEXT registration for that role reuses the smallest free
number instead of always growing — e.g. deleting CTZ-000003 (while
CTZ-000001, CTZ-000002, CTZ-000004+ still exist) means the next
citizen created gets CTZ-000003 again.

Each role's row in `user_id_sequence` is locked with SELECT ... FOR
UPDATE inside the caller's transaction, so concurrent registrations
for the same role can't collide on the same reused number.

`sync_next_value(role)` recomputes and writes the correct next-free
number into `user_id_sequence` right after a delete, so the tracker
column always reflects reality instead of only updating on the next
registration.
"""
from config.database import Database


ID_WIDTH = 6                                        # zero-padded numeric width

ROLE_PREFIX = {
    "citizen":   "CTZ",
    "beekeeper": "BKP",
    "admin":     "ADM",
}

ROLE_TABLES = {
    "citizen":   ("citizens",   "citizenID"),
    "beekeeper": ("beekeepers", "beekeeperID"),
    "admin":     ("admins",     "adminID"),
}

ALLOWED_ROLES = set(ROLE_PREFIX.keys())


def _format(role: str, n: int) -> str:
    prefix = ROLE_PREFIX.get(role)
    if not prefix:
        raise ValueError(f"Unknown role for ID generation: {role!r}")
    return f"{prefix}-{n:0{ID_WIDTH}d}"


def _find_next_free(cur, role: str) -> int:
    """
    Runs the gap-search query on an already-open cursor and returns the
    smallest free positive integer not currently used in that role's
    table. Shared by _next_sequence_value() and sync_next_value().
    """
    table, id_col = ROLE_TABLES[role]
    prefix_len = len(ROLE_PREFIX[role]) + 2   # e.g. "CTZ-" = 3 + 1 dash + 1

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


def _next_sequence_value(conn, role: str) -> int:
    """
    Atomically reserve the next FREE sequence value for `role` on an
    OPEN connection. Must be called inside a transaction the caller
    commits. Finds the smallest positive integer not currently used
    by any row in that role's table (so deleted IDs get reused).
    """
    if role not in ALLOWED_ROLES:
        raise ValueError(f"Unknown role for ID generation: {role!r}")

    with conn.cursor() as cur:
        # Mutex: lock this role's tracker row so concurrent registrations
        # for the same role serialize here instead of racing on the gap
        # search below.
        cur.execute(
            "SELECT next_value FROM user_id_sequence "
            "WHERE role = %s FOR UPDATE",
            (role,),
        )
        row = cur.fetchone()

        if not row:
            cur.execute(
                "INSERT INTO user_id_sequence (role, next_value) "
                "VALUES (%s, 1)",
                (role,),
            )
            cur.execute(
                "SELECT next_value FROM user_id_sequence "
                "WHERE role = %s FOR UPDATE",
                (role,),
            )
            row = cur.fetchone()

        next_n = _find_next_free(cur, role)

        cur.execute(
            "UPDATE user_id_sequence SET next_value = %s WHERE role = %s",
            (next_n + 1, role),
        )

        return next_n


def next_user_id(conn, role: str) -> str:
    """
    Reserve and return the next User ID for `role`
    (e.g. 'CTZ-000001') on the given connection.
    The caller MUST commit the same transaction so the reserved
    value is not wasted on rollback.
    """
    return _format(role, _next_sequence_value(conn, role))


def sync_next_value(role: str) -> int:
    """
    Recompute the smallest free number for `role` right now and write
    it into user_id_sequence.next_value. Call this right after a
    delete so the tracker column reflects reality immediately instead
    of only updating on the next registration.

    Opens its own short-lived connection/transaction — safe to call
    right after a delete's own commit.
    """
    if role not in ALLOWED_ROLES:
        raise ValueError(f"Unknown role for ID generation: {role!r}")

    conn = Database.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT next_value FROM user_id_sequence "
                "WHERE role = %s FOR UPDATE",
                (role,),
            )
            row = cur.fetchone()
            if not row:
                cur.execute(
                    "INSERT INTO user_id_sequence (role, next_value) "
                    "VALUES (%s, 1)",
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
    """
    Read-only peek at the smallest free ID. NOT safe against
    concurrency (no row lock) — for display purposes only.
    """
    if role not in ALLOWED_ROLES:
        raise ValueError(f"Unknown role for ID generation: {role!r}")

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