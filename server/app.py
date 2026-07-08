from flask import Flask, jsonify
from flask_cors import CORS

from config.config import Config
from config.database import Database
from routes.auth import auth_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS — restrict to the Next.js dev origin (configurable via .env)
    CORS(
        app,
        resources={r"/api/*": {"origins": [Config.FRONTEND_ORIGIN, "http://localhost:3000"]}},
        supports_credentials=False,
    )

    # DB pool init
    Database.init_pool()

    # Blueprints
    app.register_blueprint(auth_bp)

    # Health check (kept for backwards compatibility with your original stub)
    @app.route("/api/home", methods=["GET"])
    def home():
        return jsonify({"message": "BeeGuard API is running"})

    # Global error handlers → JSON
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"success": False, "message": "Not found", "errors": []}), 404

    @app.errorhandler(405)
    def not_allowed(_):
        return jsonify({"success": False, "message": "Method not allowed", "errors": []}), 405

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({"success": False, "message": "Internal server error", "errors": []}), 500

    return app
