from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from config.config import Config
from config.database import Database
from utils.responses import error
from routes.auth import auth_bp
from routes.pesticide import pesticide_bp
from routes.hive import hive_bp
from routes.harvest import yield_bp
from routes.queen import queen_bp
from routes.analytics import analytics_bp
from routes.notification import notification_bp
from routes.report import report_bp
from routes.cv_scan import cv_scan_bp
from routes.citizen_report import citizen_report_bp
# NEW — Bee Farm browsing / Rescue Offers / Ratings / Chat (migration 007)
from routes.farm import farm_bp
from routes.rescue_offer import rescue_offer_bp
from routes.rating import rating_bp
from routes.chat import chat_bp
from routes.chat_report import chat_report_bp
from routes.follow import follow_bp
# NEW — beekeeper verification + admin side (migration 013)
from routes.verification import verification_bp
from routes.admin import admin_bp
from routes.place import place_bp
from routes.settings import settings_bp
from routes.push import push_bp
from routes.profile import profile_bp, profile_photos_bp
from services.backup_service import maybe_run_auto_backup
from utils.logger import setup_logging


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH

    # NEW — system log files in logs/ (app.log, error.log, auth.log).
    # Set up first so every request after this is logged.
    setup_logging(app)

    # CORS — restrict to the Next.js dev origin (configurable via .env).
    # Without this, the browser blocks localhost:3000 -> localhost:8000 calls
    # and fetch() rejects with "TypeError: Failed to fetch".
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            Config.FRONTEND_ORIGIN,
            "http://localhost:3000",
            "http://localhost:5000",   # NEW — frontend on port 5000
        ]}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        supports_credentials=False,
    )

    # DB pool init
    Database.init_pool()

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(pesticide_bp)
    app.register_blueprint(hive_bp)
    app.register_blueprint(yield_bp)
    app.register_blueprint(queen_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(cv_scan_bp)
    app.register_blueprint(citizen_report_bp)
    # NEW
    app.register_blueprint(farm_bp)
    app.register_blueprint(rescue_offer_bp)
    app.register_blueprint(rating_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(chat_report_bp)
    app.register_blueprint(follow_bp)
    app.register_blueprint(verification_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(place_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(push_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(profile_photos_bp)

    # Daily automatic backup (More → Backup & Restore). Checked at most
    # every 30 minutes; the backup itself runs in the background.
    @app.before_request
    def _auto_backup_check():
        maybe_run_auto_backup()

    # Health check (kept for backwards compatibility with your original stub)
    @app.route("/api/home", methods=["GET"])
    def home():
        return jsonify({"message": "BeeGuard API is running"})

    # Serve saved scan images back out at Config.CV_SCAN_URL_PREFIX
    @app.route(f"{Config.CV_SCAN_URL_PREFIX}/<path:filename>")
    def serve_cv_scan(filename):
        return send_from_directory(Config.CV_SCAN_UPLOAD_FOLDER, filename)

    # Turn oversized uploads into a clean JSON 413 instead of a dropped connection
    @app.errorhandler(RequestEntityTooLarge)
    def handle_too_large(e):
        return error("Image is too large. Max allowed is 25 MB.", status=413)

    # Global error handlers → JSON
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"success": False, "message": "Not found", "errors": []}), 404

    @app.errorhandler(405)
    def not_allowed(_):
        return jsonify({"success": False, "message": "Method not allowed", "errors": []}), 405

    @app.errorhandler(500)
    def server_error(_):
        # The full traceback is already written to logs/error.log by
        # Flask (app.logger) — look it up by the X-Request-ID header.
        return jsonify({"success": False, "message": "Internal server error", "errors": []}), 500

    return app