import os
from dotenv import load_dotenv

load_dotenv()


def _env_bool(name: str, default: bool = True) -> bool:
    """Accepts 1/true/yes/on (any case) as True."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"
    PORT = int(os.getenv("PORT", "8000"))

    # JWT
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret")
    JWT_ALGORITHM = "HS256"
    # Standard session (Remember Me OFF)
    JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "24"))
    # Extended session (Remember Me ON) — 30 days default
    JWT_EXPIRES_HOURS_REMEMBER = int(
        os.getenv("JWT_EXPIRES_HOURS_REMEMBER", str(24 * 30))
    )

    # MySQL
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "beeguard_system")

    # CORS
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

    # SMTP
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "").strip()
    # Gmail shows App Passwords with spaces ("abcd efgh ijkl mnop"); strip them.
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").replace(" ", "")
    SMTP_FROM = os.getenv("SMTP_FROM") or (
        f"BeeGuard <{SMTP_USER}>" if SMTP_USER else "BeeGuard <no-reply@beeguard.local>"
    )
    SMTP_USE_TLS = _env_bool("SMTP_USE_TLS", True)  # STARTTLS (port 587)

    # OTP (email verification / password reset)
    OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "10"))
    OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))

    # Yield analytics
    QUEEN_MAX_AGE_DAYS = int(os.getenv("QUEEN_MAX_AGE_DAYS", "730"))     # 2 years
    YIELD_REPLACE_THRESHOLD_PCT = float(
        os.getenv("YIELD_REPLACE_THRESHOLD_PCT", "60")
    )

    # ── Local YOLO model (bee/insect species identification — Feature: CV Scan) ──
    CV_SCAN_MODEL_PATH = os.getenv(
        "CV_SCAN_MODEL_PATH",
        os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "weights", "best.pt"
        ),
    )
    # Boxes below this confidence are dropped before majority-voting runs.
    CV_SCAN_CONF_THRESHOLD = float(os.getenv("CV_SCAN_CONF_THRESHOLD", "0.4"))
    # "cpu", "cuda", "cuda:0", etc.
    CV_SCAN_DEVICE = os.getenv("CV_SCAN_DEVICE", "cpu")
    # Longest side the image is resized to before inference.
    CV_SCAN_IMGSZ = int(os.getenv("CV_SCAN_IMGSZ", "1024"))

    # CV Scan image storage (local disk for now)
    CV_SCAN_UPLOAD_FOLDER = os.getenv(
        "CV_SCAN_UPLOAD_FOLDER",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "cv_scans"),
    )
    CV_SCAN_URL_PREFIX = "/uploads/cv-scans"

    # Reject multipart bodies over 27 MB at the WSGI level (service checks 25 MB)
    MAX_CONTENT_LENGTH = 27 * 1024 * 1024