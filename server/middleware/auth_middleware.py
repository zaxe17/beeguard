from functools import wraps
from flask import request, g
import jwt

from services.auth_service import AuthService
from utils.responses import error


def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return error("Missing or invalid Authorization header.", status=401)
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = AuthService.decode_token(token)
        except jwt.ExpiredSignatureError:
            return error("Token has expired.", status=401)
        except jwt.InvalidTokenError:
            return error("Invalid token.", status=401)

        g.user_id = payload.get("sub")
        g.role = payload.get("role")
        return fn(*args, **kwargs)

    return wrapper


def optional_token(fn):
    """
    Like token_required, but never rejects the request for a missing
    or invalid token — g.user_id / g.role are just left None in that
    case. For endpoints that work for BOTH guests and logged-in users
    — e.g. the CV Scan upload, which citizens can use even without an
    account (cv_scans.citizenID is nullable by design for exactly
    this). Only actually SUBMITTING a report requires being logged in
    as a citizen — that route still uses token_required + role_required.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        g.user_id = None
        g.role = None

        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1].strip()
            try:
                payload = AuthService.decode_token(token)
                g.user_id = payload.get("sub")
                g.role = payload.get("role")
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                # Invalid/expired token on an optional-auth route just
                # means "treat this as a guest" — not an error.
                pass

        return fn(*args, **kwargs)

    return wrapper


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if getattr(g, "role", None) not in roles:
                return error("Forbidden.", status=403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator