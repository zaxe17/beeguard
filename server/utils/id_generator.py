import secrets


ROLE_PREFIX = {
    "citizen": "CTZ",
    "beekeeper": "BKP",
    "admin": "ADM",
}


def generate_user_id(role: str) -> str:
    """Return a 15-char role-prefixed ID (e.g. 'CTZ' + 12 hex chars)."""
    prefix = ROLE_PREFIX.get(role.lower())
    if not prefix:
        raise ValueError(f"Unknown role: {role}")
    return f"{prefix}{secrets.token_hex(6).upper()}"  # 3 + 12 = 15
