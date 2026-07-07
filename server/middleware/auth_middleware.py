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


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if getattr(g, "role", None) not in roles:
                return error("Forbidden.", status=403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
