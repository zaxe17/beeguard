# routes/settings.py
#
# More → Settings page.
#
#   GET   /api/settings          -> my notification settings
#   PATCH /api/settings          {"push_enabled": false, ...}
#
#   GET   /api/settings/system   -> {"auto_backup": true}          (admin)
#   PATCH /api/settings/system   {"auto_backup": true}             (admin)
#
#   GET   /api/settings/backups                 -> list, newest first  (admin)
#   POST  /api/settings/backups                 -> "Back Up Data Now"  (admin)
#   GET   /api/settings/backups/<name>/download?format=xlsx|sql        (admin)
#                                   -> the Excel copy (default) or the .sql
#   POST  /api/settings/backups/<name>/restore  {"confirm": "RESTORE"} (admin)

from flask import Blueprint, request, g, send_file

from middleware.auth_middleware import token_required, role_required
from services.settings_service import SettingsService
from services.backup_service import BackupService
from utils.responses import success, error


settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


# ── MY NOTIFICATION SETTINGS ─────────────────
@settings_bp.route("", methods=["GET"])
@token_required
def get_my_settings():
    try:
        return success("OK", data=SettingsService.get_user(g.role, g.user_id))
    except ValueError as e:
        return error(str(e), status=400)


@settings_bp.route("", methods=["PATCH"])
@token_required
def update_my_settings():
    try:
        data = SettingsService.update_user(
            g.role, g.user_id, request.get_json(silent=True) or {}
        )
    except ValueError as e:
        return error(str(e), status=422)
    return success("Settings saved.", data=data)


# ── SYSTEM SETTINGS (admin) ──────────────────
@settings_bp.route("/system", methods=["GET"])
@token_required
@role_required("admin")
def get_system_settings():
    return success("OK", data=SettingsService.get_system())


@settings_bp.route("/system", methods=["PATCH"])
@token_required
@role_required("admin")
def update_system_settings():
    try:
        data = SettingsService.update_system(request.get_json(silent=True) or {})
    except ValueError as e:
        return error(str(e), status=422)
    return success("Settings saved.", data=data)


# ── BACKUPS (admin) ──────────────────────────
@settings_bp.route("/backups", methods=["GET"])
@token_required
@role_required("admin")
def list_backups():
    return success("OK", data=BackupService.list_backups())


@settings_bp.route("/backups", methods=["POST"])
@token_required
@role_required("admin")
def create_backup():
    try:
        backup = BackupService.create_backup("manual")
    except Exception as e:
        print(f"[BACKUP] Manual backup failed: {e}")
        return error("Backup failed. Please try again.", status=500)
    return success("Backup saved.", data=backup, status=201)


@settings_bp.route("/backups/<name>/download", methods=["GET"])
@token_required
@role_required("admin")
def download_backup(name):
    fmt = (request.args.get("format") or "xlsx").lower()
    if fmt not in ("xlsx", "sql"):
        return error("format must be xlsx or sql.", status=422)
    try:
        path, download_name = BackupService.file_path(name, fmt)
    except LookupError as e:
        return error(str(e), status=404)
    except ImportError:
        return error(
            "Excel export needs openpyxl on the server: pip install openpyxl",
            status=500,
        )
    except Exception as e:
        print(f"[BACKUP] Excel download of {name} failed: {e}")
        return error("Couldn't make the Excel file for this backup.", status=500)
    mimetype = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if fmt == "xlsx" else "application/sql"
    )
    return send_file(path, as_attachment=True, download_name=download_name, mimetype=mimetype)


@settings_bp.route("/backups/<name>/restore", methods=["POST"])
@token_required
@role_required("admin")
def restore_backup(name):
    payload = request.get_json(silent=True) or {}
    # Replaces ALL current data — the page must send this on purpose.
    if payload.get("confirm") != "RESTORE":
        return error('Send {"confirm": "RESTORE"} to restore a backup.', status=422)
    try:
        result = BackupService.restore(name)
    except LookupError:
        return error("Backup not found.", status=404)
    except Exception as e:
        print(f"[BACKUP] Restore of {name} failed: {e}")
        return error(
            "Restore failed. Your data before the restore was saved as a "
            "'pre-restore' backup.",
            status=500,
        )
    return success(
        "Backup restored. Your data from before the restore was saved as a "
        "'pre-restore' backup, in case you need it.",
        data=result,
    )