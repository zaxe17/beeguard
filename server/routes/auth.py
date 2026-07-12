from flask import Blueprint, request, g
import pymysql

from services.auth_service import AuthService
from validators.auth_validator import (
    validate_register_payload,
    validate_login_payload,
    validate_unique_check_payload,
    validate_otp_payload,
)
from middleware.auth_middleware import token_required
from utils.responses import success, error
from models.citizen import CitizenModel
from models.beekeeper import BeekeeperModel
from models.admin import AdminModel


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _field_errors_to_list(fe: dict) -> list[str]:
    """Convert {field: msg} dict into a flat list for backward-compat clients."""
    return [f"{k}: {v}" if k != "_" else v for k, v in fe.items()]


def _envelope_error(message, field_errors: dict, status: int):
    """
    Wrap field-mapped errors in an envelope that includes BOTH:
      - errors: [str, ...]           (legacy list clients)
      - field_errors: {field: msg}   (new structured clients)
    """
    resp, code = error(
        message, errors=_field_errors_to_list(field_errors), status=status
    )
    payload = resp.get_json()
    payload["field_errors"] = field_errors
    return payload, code


# ─────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_register_payload(payload)
    if field_errors:
        body, code = _envelope_error("Validation failed.", field_errors, 422)
        return body, code

    try:
        ok, message, data = AuthService.register(cleaned)
    except pymysql.err.IntegrityError as e:
        msg = str(e).lower()
        if "email" in msg:
            body, code = _envelope_error(
                "This email address is already registered.",
                {"email": "This email address is already registered."},
                409,
            )
            return body, code
        if "contact_no" in msg:
            body, code = _envelope_error(
                "This phone number is already registered.",
                {"contact_no": "This phone number is already registered."},
                409,
            )
            return body, code
        if "username" in msg:
            body, code = _envelope_error(
                "Username already taken.",
                {"username": "Username already taken."},
                409,
            )
            return body, code
        return error("Registration failed due to a database conflict.", status=409)
    except Exception as e:
        # Do NOT leak internal error details
        print(f"[REGISTER] Unhandled error: {e}")
        return error("Registration failed. Please try again.", status=500)

    if not ok:
        # data is a list of offending fields e.g. ["email"]
        offending = data if isinstance(data, list) else []
        fe = {f: message for f in offending} or {"_": message}
        body, code = _envelope_error(message, fe, 409)
        return body, code

    return success(message, data=data, status=201)


# ─────────────────────────────────────────────
# CHECK-UNIQUE (pre-flight before T&C)
# ─────────────────────────────────────────────
@auth_bp.route("/check-unique", methods=["POST"])
def check_unique():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_unique_check_payload(payload)
    if field_errors:
        body, code = _envelope_error("Validation failed.", field_errors, 422)
        return body, code

    try:
        taken = AuthService.check_unique(
            role=cleaned["role"],
            username=cleaned.get("username"),
            email=cleaned.get("email"),
            contact_no=cleaned.get("contact_no"),
        )
    except Exception as e:
        print(f"[CHECK-UNIQUE] Unhandled error: {e}")
        return error("Unable to check uniqueness right now.", status=500)

    if taken:
        fe = {}
        if taken.get("email"):
            fe["email"] = "This email address is already registered."
        if taken.get("contact_no"):
            fe["contact_no"] = "This phone number is already registered."
        if taken.get("username"):
            fe["username"] = "Username already taken."
        body, code = _envelope_error(
            "One or more fields are already in use.", fe, 409
        )
        return body, code

    return success("Available.", data={"available": True}, status=200)


# ─────────────────────────────────────────────
# VERIFY OTP
# ─────────────────────────────────────────────
@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_otp_payload(payload, require_code=True)
    if field_errors:
        body, code = _envelope_error("Validation failed.", field_errors, 422)
        return body, code

    try:
        ok, message, data = AuthService.verify_registration_otp(
            email=cleaned["email"], role=cleaned["role"], code=cleaned["code"]
        )
    except Exception as e:
        print(f"[VERIFY-OTP] Unhandled error: {e}")
        return error("Verification failed. Please try again.", status=500)

    if not ok:
        body, code = _envelope_error(message, {"code": message}, 400)
        return body, code
    return success(message, data=data, status=200)


# ─────────────────────────────────────────────
# RESEND OTP
# ─────────────────────────────────────────────
@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_otp_payload(payload, require_code=False)
    if field_errors:
        body, code = _envelope_error("Validation failed.", field_errors, 422)
        return body, code

    try:
        ok, message = AuthService.resend_registration_otp(
            email=cleaned["email"], role=cleaned["role"]
        )
    except Exception as e:
        print(f"[RESEND-OTP] Unhandled error: {e}")
        return error("Could not resend code. Please try again.", status=500)

    if not ok:
        return error(message, status=429)
    return success(message, status=200)


# ─────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    cleaned, field_errors = validate_login_payload(payload)
    if field_errors:
        body, code = _envelope_error("Validation failed.", field_errors, 422)
        return body, code

    try:
        ok, message, data = AuthService.login(
            cleaned["role"], cleaned["identifier"], cleaned["password"]
        )
    except Exception as e:
        print(f"[LOGIN] Unhandled error: {e}")
        return error("Login failed. Please try again.", status=500)

    if not ok:
        # If verification is required, pass through the hint payload
        if isinstance(data, dict) and data.get("requires_verification"):
            return success(message, data=data, status=403)
        return error(message, status=401)
    return success(message, data=data, status=200)


# ─────────────────────────────────────────────
# ME
# ─────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    user = AuthService.get_user(g.role, g.user_id)
    if not user:
        return error("User not found.", status=404)
    return success("OK", data=user, status=200)


# ─────────────────────────────────────────────
# DELETE USER (admin-only)
# ─────────────────────────────────────────────
_DELETE_MODEL_MAP = {
    "citizen": CitizenModel,
    "beekeeper": BeekeeperModel,
    "admin": AdminModel,
}


@auth_bp.route("/users/<role>/<user_id>", methods=["DELETE"])
@token_required
def delete_user(role, user_id):
    if g.role != "admin":
        return error("Only admins can delete users.", status=403)

    model = _DELETE_MODEL_MAP.get(role)
    if not model:
        return error("Invalid role.", status=400)

    existing = model.find_by_id(user_id)
    if not existing:
        return error("User not found.", status=404)

    try:
        model.delete(user_id)
    except pymysql.err.IntegrityError:
        return error(
            "Cannot delete this user because they have related records "
            "(reports, hives, alerts, etc.). Remove or reassign those first.",
            status=409,
        )
    except Exception as e:
        print(f"[DELETE-USER] Unhandled error: {e}")
        return error("Failed to delete user. Please try again.", status=500)

    return success(f"{role.capitalize()} deleted successfully.", status=200)