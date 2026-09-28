# routes/cv_scan.py

from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required, optional_token
from services.cv_scan_service import CVScanService
from utils.responses import success, error


cv_scan_bp = Blueprint("cv_scan", __name__, url_prefix="/api/cv-scans")


# ── CREATE — upload an image, run identification, record the scan ─
# Deliberately open to guests: g.user_id is None when no valid token
# is attached (see middleware.auth_middleware.optional_token), and
# CVScanService.scan_and_record()/CVScanModel already accept a NULL
# citizen_id per the schema's "nullable: guest scans" design. Only
# actual REPORT submission (routes/citizen_report.py) requires being
# logged in as a citizen.
@cv_scan_bp.route("", methods=["POST"])
@optional_token
def create_scan():
    # A beekeeper/admin token attached to a citizen-facing scan
    # doesn't make sense — reject that explicitly rather than silently
    # recording it under the wrong role. A citizen token or no token
    # at all (guest) are both fine.
    if g.role is not None and g.role != "citizen":
        return error("This feature is for citizens (or guests) only.", status=403)

    if "image" not in request.files:
        return error("No image file provided (expected form field 'image').", status=422)

    file = request.files["image"]
    if not file or file.filename == "":
        return error("No image file selected.", status=422)

    try:
        result = CVScanService.scan_and_record(g.user_id, file)
    except ValueError as e:
        return error(str(e), status=400)
    except Exception as e:
        print(f"[CVSCAN-CREATE] Unhandled error: {e}")
        return error("Failed to process scan. Please try again.", status=500)

    return success("Scan completed.", data=result, status=201)


# ── LIST — this citizen's own scan history (requires login: a guest
#    has no persistent identity to list history for) ─────
@cv_scan_bp.route("", methods=["GET"])
@token_required
@role_required("citizen")
def list_scans():
    rows = CVScanService.list_history(g.user_id)
    return success("OK", data=rows, status=200)