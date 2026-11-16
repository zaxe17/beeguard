import os
from dotenv import load_dotenv

load_dotenv()


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
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@beeguard.local")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "1") == "1"

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
    # Replaces the old Roboflow-hosted-inference setup. Custom-trained weights
    # (Apis cerana / Apis mellifera / Tetragonula biroi) live on disk inside
    # the backend repo by default at backend/weights/best.pt; override with
    # CV_SCAN_MODEL_PATH if you keep it somewhere else.
    CV_SCAN_MODEL_PATH = os.getenv(
        "CV_SCAN_MODEL_PATH",
        os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "weights", "best.pt"
        ),
    )
    # Boxes below this confidence are dropped before majority-voting runs.
    CV_SCAN_CONF_THRESHOLD = float(os.getenv("CV_SCAN_CONF_THRESHOLD", "0.4"))
    # "cpu", "cuda", "cuda:0", etc. — leave as "cpu" unless the server has a GPU.
    CV_SCAN_DEVICE = os.getenv("CV_SCAN_DEVICE", "cpu")
    # Longest side the image is resized to before inference (YOLO handles this
    # internally, this just controls the tradeoff between speed and accuracy).
    CV_SCAN_IMGSZ = int(os.getenv("CV_SCAN_IMGSZ", "1024"))

    # CV Scan image storage — saved to local disk for now (no cloud
    # storage account set up yet). CV_SCAN_UPLOAD_FOLDER is a real
    # filesystem path where uploaded images are written;
    # CV_SCAN_URL_PREFIX is the URL path Flask serves that same folder
    # under (see app.py's static route), stored in cv_scans.image_url.
    CV_SCAN_UPLOAD_FOLDER = os.getenv(
        "CV_SCAN_UPLOAD_FOLDER",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "cv_scans"),
    )
    CV_SCAN_URL_PREFIX = "/uploads/cv-scans"

    # Reject multipart bodies over 27 MB at the WSGI level (service checks 25 MB)
    MAX_CONTENT_LENGTH = 27 * 1024 * 1024