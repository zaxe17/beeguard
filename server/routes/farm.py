# routes/farm.py
from flask import Blueprint, request, g

from middleware.auth_middleware import optional_token
from services.farm_service import FarmService
from utils.responses import success, error

farm_bp = Blueprint("farm_bp", __name__, url_prefix="/api/farms")


@farm_bp.route("", methods=["GET"])
@optional_token
def list_farms():
    search = request.args.get("search")
    lat_raw = request.args.get("lat")
    lng_raw = request.args.get("lng")
    try:
        lat = float(lat_raw) if lat_raw is not None else None
        lng = float(lng_raw) if lng_raw is not None else None
    except ValueError:
        return error("lat/lng must be numbers.", status=400)

    farms = FarmService.list_farms(search=search, lat=lat, lng=lng)
    return success("Farms retrieved.", data=farms)


@farm_bp.route("/<beekeeper_id>", methods=["GET"])
@optional_token
def get_farm(beekeeper_id):
    viewer_citizen_id = g.user_id if g.role == "citizen" else None
    farm = FarmService.get_farm_detail(beekeeper_id, viewer_citizen_id=viewer_citizen_id)
    if not farm:
        return error("Farm not found.", status=404)
    return success("Farm retrieved.", data=farm)