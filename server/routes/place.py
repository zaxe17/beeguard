# routes/place.py
#
# GET /api/places/reverse?lat=14.4911&lng=121.0190
#   -> { "name": "Moonwalk, Parañaque" }   (name is null if not found yet)
#
# Every page asks the backend for place names instead of calling
# OpenStreetMap from the browser — the backend looks each spot up only
# once and shares the answer with everyone (utils/place_name.py), so we
# stay under Nominatim's 1-request-per-second limit and don't get blocked.

from flask import Blueprint, request

from middleware.auth_middleware import token_required
from utils.place_name import reverse_place_name
from utils.responses import success, error


place_bp = Blueprint("place", __name__, url_prefix="/api/places")


@place_bp.route("/reverse", methods=["GET"])
@token_required
def reverse():
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except ValueError:
        return error("lat and lng must be numbers.", status=422)
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return error("lat / lng out of range.", status=422)

    return success("OK", data={"name": reverse_place_name(lat, lng)}, status=200)