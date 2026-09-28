# routes/verification.py
#
# Beekeeper account verification. Admin review endpoints live in
# routes/admin.py (/api/admin/verifications/...).

from flask import Blueprint, request, g, send_file

from middleware.auth_middleware import token_required, role_required
from services.verification_service import VerificationService, DOCUMENT_TYPES
from utils.responses import success, error

verification_bp = Blueprint("verification_bp", __name__, url_prefix="/api/verification")


# Options for the "Type of Document" dropdown.
@verification_bp.route("/document-types", methods=["GET"])
def document_types():
    return success("OK", data=DOCUMENT_TYPES)


# The logged-in beekeeper's own verification status.
@verification_bp.route("/me", methods=["GET"])
@token_required
@role_required("beekeeper")
def my_verification():
    try:
        data = VerificationService.get_mine(g.user_id)
    except LookupError as e:
        return error(str(e), status=404)
    return success("OK", data=data)


# Submit (or re-submit after a rejection).
# multipart/form-data: document_type=<one of DOCUMENT_TYPES>, document=<file>
@verification_bp.route("", methods=["POST"])
@token_required
@role_required("beekeeper")
def submit_verification():
    document_type = (request.form.get("document_type") or "").strip()
    file = request.files.get("document")
    if not file or not file.filename:
        return error("Please choose a file to upload.", status=422)
    try:
        data = VerificationService.submit(g.user_id, document_type, file)
    except LookupError as e:
        return error(str(e), status=404)
    except ValueError as e:
        return error(str(e), status=422)
    return success("Submitted. An admin will review your document.", data=data, status=201)


# The uploaded document itself — only its owner or an admin. The
# frontend fetches this with the Authorization header and shows it as
# a blob (a plain <img src> can't send the token).
@verification_bp.route("/document/<beekeeper_id>", methods=["GET"])
@token_required
@role_required("beekeeper", "admin")
def get_document(beekeeper_id):
    try:
        path, mimetype = VerificationService.document_file(g.role, g.user_id, beekeeper_id)
    except PermissionError as e:
        return error(str(e), status=403)
    except LookupError as e:
        return error(str(e), status=404)
    return send_file(path, mimetype=mimetype, max_age=0)