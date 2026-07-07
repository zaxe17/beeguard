from flask import Blueprint, request, g
import pymysql

from services.auth_service import AuthService
from validators.auth_validator import validate_register_payload, validate_login_payload
from middleware.auth_middleware import token_required
from utils.responses import success, error


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    cleaned, errs = validate_register_payload(payload)
    if errs:
        return error("Validation failed.", errors=errs, status=422)

    try:
        ok, message, data = AuthService.register(cleaned)
    except pymysql.err.IntegrityError as e:
        # Fallback for race conditions on unique keys
        msg = str(e).lower()
        if "email" in msg:
            return error("Email already registered.", errors=["email"], status=409)
        if "username" in msg:
            return error("Username already taken.", errors=["username"], status=409)
        return error("Database integrity error.", errors=[str(e)], status=409)
    except Exception as e:
        return error("Registration failed.", errors=[str(e)], status=500)

    if not ok:
        return error(message, errors=data if isinstance(data, list) else [], status=409)
    return success(message, data=data, status=201)


@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    cleaned, errs = validate_login_payload(payload)
    if errs:
        return error("Validation failed.", errors=errs, status=422)

    try:
        ok, message, data = AuthService.login(
            cleaned["role"], cleaned["identifier"], cleaned["password"]
        )
    except Exception as e:
        return error("Login failed.", errors=[str(e)], status=500)

    if not ok:
        return error(message, status=401)
    return success(message, data=data, status=200)


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    user = AuthService.get_user(g.role, g.user_id)
    if not user:
        return error("User not found.", status=404)
    return success("OK", data=user, status=200)
