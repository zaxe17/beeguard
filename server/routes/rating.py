# routes/rating.py
from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required, optional_token
from services.rating_service import RatingService
from validators.rating_validator import validate_create_rating
from utils.responses import success, error

rating_bp = Blueprint("rating_bp", __name__, url_prefix="/api/ratings")


@rating_bp.route("", methods=["POST"])
@token_required
@role_required("citizen")
def create_rating():
    cleaned, errors = validate_create_rating(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        rating = RatingService.create_rating(g.user_id, cleaned)
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    return success("Rating submitted.", data=rating, status=201)


@rating_bp.route("/beekeeper/<beekeeper_id>", methods=["GET"])
@optional_token
def list_ratings(beekeeper_id):
    data = RatingService.list_for_beekeeper(beekeeper_id)
    return success("Ratings retrieved.", data=data)
