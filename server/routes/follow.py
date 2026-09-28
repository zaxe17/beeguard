# routes/follow.py
from flask import Blueprint, g

from middleware.auth_middleware import token_required, role_required
from services.follow_service import FollowService
from utils.responses import success, error

follow_bp = Blueprint("follow_bp", __name__, url_prefix="/api/follows")


@follow_bp.route("/<beekeeper_id>", methods=["POST"])
@token_required
@role_required("citizen")
def follow(beekeeper_id):
    try:
        data = FollowService.follow(g.user_id, beekeeper_id)
    except ValueError as e:
        return error(str(e), status=404)
    return success("Now following.", data=data, status=201)


@follow_bp.route("/<beekeeper_id>", methods=["DELETE"])
@token_required
@role_required("citizen")
def unfollow(beekeeper_id):
    data = FollowService.unfollow(g.user_id, beekeeper_id)
    return success("Unfollowed.", data=data)


@follow_bp.route("/<beekeeper_id>/status", methods=["GET"])
@token_required
@role_required("citizen")
def status(beekeeper_id):
    data = FollowService.status(g.user_id, beekeeper_id)
    return success("Status retrieved.", data=data)