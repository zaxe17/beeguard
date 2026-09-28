# routes/rescue_offer.py
from flask import Blueprint, request, g

from middleware.auth_middleware import token_required, role_required
from services.rescue_offer_service import RescueOfferService
from validators.rescue_offer_validator import validate_create_offer, validate_respond_offer
from utils.responses import success, error

rescue_offer_bp = Blueprint("rescue_offer_bp", __name__, url_prefix="/api/rescue-offers")


@rescue_offer_bp.route("", methods=["POST"])
@token_required
@role_required("beekeeper")
def create_offer():
    cleaned, errors = validate_create_offer(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        offer = RescueOfferService.create_offer(g.user_id, cleaned)
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    return success("Offer submitted.", data=offer, status=201)


# ── BEEKEEPER REPORT TAB ──────────────────────────
# Open citizen reports near this beekeeper + every report they already
# offered on, each with "beekeeper_status" for the tab filter.
@rescue_offer_bp.route("/reports", methods=["GET"])
@token_required
@role_required("beekeeper")
def list_reports_for_beekeeper():
    try:
        reports = RescueOfferService.list_reports_for_beekeeper(g.user_id)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Reports retrieved.", data=reports)


@rescue_offer_bp.route("/reports/<report_id>", methods=["GET"])
@token_required
@role_required("beekeeper")
def get_report_for_beekeeper(report_id):
    try:
        report = RescueOfferService.get_report_for_beekeeper(g.user_id, report_id)
    except LookupError as e:
        return error(str(e), status=404)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Report retrieved.", data=report)


@rescue_offer_bp.route("/report/<report_id>", methods=["GET"])
@token_required
@role_required("citizen")
def list_offers_for_report(report_id):
    try:
        offers = RescueOfferService.list_for_report(g.user_id, report_id)
    except PermissionError as e:
        return error(str(e), status=403)
    return success("Offers retrieved.", data=offers)


@rescue_offer_bp.route("/mine", methods=["GET"])
@token_required
@role_required("citizen", "beekeeper")
def list_my_offers():
    offers = RescueOfferService.list_mine(g.role, g.user_id)
    return success("Offers retrieved.", data=offers)


@rescue_offer_bp.route("/<offer_id>/respond", methods=["PATCH"])
@token_required
@role_required("citizen")
def respond_offer(offer_id):
    cleaned, errors = validate_respond_offer(request.get_json(silent=True) or {})
    if errors:
        return error("Validation failed.", errors=errors, status=422)
    try:
        offer = RescueOfferService.respond(g.user_id, offer_id, cleaned["action"])
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    return success("Offer updated.", data=offer)


@rescue_offer_bp.route("/<offer_id>/resolve", methods=["PATCH"])
@token_required
@role_required("citizen", "beekeeper")
def resolve_offer(offer_id):
    try:
        offer = RescueOfferService.resolve(g.role, g.user_id, offer_id)
    except PermissionError as e:
        return error(str(e), status=403)
    except ValueError as e:
        return error(str(e), status=400)
    return success("Offer marked resolved.", data=offer)