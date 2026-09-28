# services/rescue_offer_service.py
#
# Rescue offer lifecycle: a beekeeper offers to collect a colony from
# a citizen's `reports` row (Pending) -> the citizen accepts/rejects
# -> once Accepted, either party can mark it Resolved, which also
# closes out the underlying report and unlocks a rating.

import datetime as dt

from config.database import Database
from models.rescue_offer import RescueOfferModel
from models.report import ReportModel
from services.notification_service import NotificationService

try:
    from geopy.distance import geodesic
except ImportError:  # pragma: no cover — geopy is in requirements.txt
    geodesic = None


# A beekeeper's Report tab only lists open reports within this distance
# of their farm pin. Reports they already made an offer on always show,
# and a beekeeper with no pin set sees every open report.
NEARBY_REPORT_RADIUS_KM = 50


def _beekeeper_row(beekeeper_id: str) -> dict | None:
    return Database.execute(
        """
        SELECT beekeeperID, latitude, longitude, verification_status
        FROM beekeepers
        WHERE beekeeperID = %s AND deleted_at IS NULL
        LIMIT 1
        """,
        (beekeeper_id,),
        fetchone=True,
    )


def _require_verified(beekeeper: dict | None) -> None:
    if not beekeeper or beekeeper.get("verification_status") != "Verified":
        raise PermissionError("Only verified beekeepers can view and respond to reports.")


def _distance_km(beekeeper: dict | None, row: dict) -> float | None:
    if (
        geodesic is None or not beekeeper
        or beekeeper.get("latitude") is None or beekeeper.get("longitude") is None
        or row.get("latitude") is None or row.get("longitude") is None
    ):
        return None
    try:
        return round(
            geodesic(
                (float(beekeeper["latitude"]), float(beekeeper["longitude"])),
                (float(row["latitude"]), float(row["longitude"])),
            ).km,
            1,
        )
    except Exception:
        return None


# A beekeeper can offer again after the citizen declines, while the
# report is still open — up to this many offers per report in total.
MAX_OFFERS_PER_REPORT = 3


def _beekeeper_status(row: dict) -> str:
    """
    The report's status FROM THIS BEEKEEPER'S point of view — matches
    the tabs on app/beekeeper/report/page.tsx:
      pending      report still open (with or without my pending offer)
      in-progress  citizen accepted MY offer
      resolved     my rescue is done
      rejected     report closed for me — the citizen cancelled it, or
                   another beekeeper got it (the admin side shows
                   cancelled reports as "Cancelled")
    A declined offer on a report that's STILL OPEN stays "pending" — the
    beekeeper can send a new offer (see can_offer).
    """
    offer = row.get("my_offer_status")
    if offer == "Accepted":
        return "in-progress"
    if offer == "Resolved":
        return "resolved"
    if row.get("status") == "Pending":
        return "pending"
    return "rejected"


def _offer_limits(row: dict) -> tuple[int, int, bool]:
    """(offers made, offers left, can send an offer now) for this beekeeper."""
    made = int(row.get("my_offer_count") or 0)
    left = max(0, MAX_OFFERS_PER_REPORT - made)
    can_offer = (
        row.get("status") == "Pending"
        and row.get("my_offer_status") not in ("Pending", "Accepted", "Resolved")
        and left > 0
    )
    return made, left, can_offer


def _iso(v):
    return v.isoformat() if isinstance(v, (dt.date, dt.datetime)) else v


def _serialize_beekeeper_report(row: dict, beekeeper: dict | None) -> dict:
    return {
        "reportID":              row["reportID"],
        "citizenID":             row["citizenID"],
        "citizen_name":          row.get("citizen_name"),
        "image_url":             row.get("image_url"),
        "ai_species_identified": row.get("ai_species_identified"),
        "latitude":              float(row["latitude"]) if row.get("latitude") is not None else None,
        "longitude":             float(row["longitude"]) if row.get("longitude") is not None else None,
        "bee_danger":            row.get("bee_danger"),
        "description":           row.get("description"),
        "status":                row.get("status"),
        "sighted_at":            _iso(row.get("sighted_at")),
        "reported_at":           _iso(row.get("reported_at")),
        "resolved_at":           _iso(row.get("resolved_at")),
        "distance_km":           _distance_km(beekeeper, row),
        "my_offer_id":           row.get("my_offer_id"),
        "my_offered_fee":        float(row["my_offered_fee"]) if row.get("my_offered_fee") is not None else None,
        "my_offer_status":       row.get("my_offer_status"),
        "my_rating":             int(row["my_rating"]) if row.get("my_rating") is not None else None,
        "beekeeper_status":      _beekeeper_status(row),
        # Offering again after the citizen declines (MAX_OFFERS_PER_REPORT)
        "my_offer_count":        _offer_limits(row)[0],
        "offers_left":           _offer_limits(row)[1],
        "can_offer":             _offer_limits(row)[2],
    }


class RescueOfferService:

    # ── CREATE (beekeeper) ──────────────────────
    @staticmethod
    def create_offer(beekeeper_id: str, payload: dict) -> dict:
        _require_verified(_beekeeper_row(beekeeper_id))

        report = ReportModel.find_by_id(payload["report_id"])
        if not report:
            raise ValueError("Report not found.")
        # Only while the citizen is still choosing — once they accept
        # someone (In Progress) a new offer could never be accepted.
        if report.get("status") != "Pending":
            raise ValueError("This report is no longer accepting offers.")

        existing = Database.execute(
            """
            SELECT 1 FROM rescue_offers
            WHERE report_id = %s AND beekeeperID = %s
              AND offer_status IN ('Pending', 'Accepted', 'Resolved')
            LIMIT 1
            """,
            (payload["report_id"], beekeeper_id),
            fetchone=True,
        )
        if existing:
            raise ValueError(
                "You already have an offer on this report. Wait for the citizen to answer it."
            )

        # Declined before? Offering again is fine — up to the limit.
        made = int((Database.execute(
            "SELECT COUNT(*) AS c FROM rescue_offers WHERE report_id = %s AND beekeeperID = %s",
            (payload["report_id"], beekeeper_id),
            fetchone=True,
        ) or {}).get("c", 0) or 0)
        if made >= MAX_OFFERS_PER_REPORT:
            raise ValueError(
                f"You've already sent {MAX_OFFERS_PER_REPORT} offers on this report — "
                f"that's the limit."
            )

        conn = Database.get_connection()
        try:
            offer_id = RescueOfferModel.insert_with_conn(conn, {
                "report_id":     payload["report_id"],
                "beekeeper_id":  beekeeper_id,
                "offered_fee":   payload["offered_fee"],
            })
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        offer = RescueOfferModel.find_with_context(offer_id)

        # Tell the citizen they have a new offer (migration 012).
        if offer and offer.get("citizenID"):
            NotificationService.notify_many([
                NotificationService.offer_received_item(
                    citizen_id=offer["citizenID"],
                    report_id=payload["report_id"],
                    beekeeper_name=offer.get("beekeeper_name"),
                    offered_fee=payload["offered_fee"],
                    again=made > 0,
                )
            ])

        return offer

    # ── READ ─────────────────────────────────────
    @staticmethod
    def list_for_report(citizen_id: str, report_id: str) -> list[dict]:
        report = ReportModel.find_by_id_and_citizen(report_id, citizen_id)
        if not report:
            raise PermissionError("Report does not exist or is not owned by this citizen.")
        return RescueOfferModel.list_by_report(report_id)

    # ── BEEKEEPER REPORT TAB ─────────────────────
    @staticmethod
    def list_reports_for_beekeeper(beekeeper_id: str) -> list[dict]:
        beekeeper = _beekeeper_row(beekeeper_id)
        _require_verified(beekeeper)

        out = []
        for row in ReportModel.list_for_beekeeper_feed(beekeeper_id):
            item = _serialize_beekeeper_report(row, beekeeper)
            # Open reports are only "nearby" ones; my own offers always show.
            if (
                item["my_offer_id"] is None
                and item["distance_km"] is not None
                and item["distance_km"] > NEARBY_REPORT_RADIUS_KM
            ):
                continue
            out.append(item)
        return out

    @staticmethod
    def get_report_for_beekeeper(beekeeper_id: str, report_id: str) -> dict:
        beekeeper = _beekeeper_row(beekeeper_id)
        _require_verified(beekeeper)

        row = ReportModel.find_for_beekeeper(beekeeper_id, report_id)
        if not row:
            raise LookupError("Report not found.")
        if row.get("status") != "Pending" and not row.get("my_offer_id"):
            raise PermissionError("This report is no longer open for offers.")
        return _serialize_beekeeper_report(row, beekeeper)

    @staticmethod
    def list_mine(role: str, user_id: str) -> list[dict]:
        if role == "beekeeper":
            return RescueOfferModel.list_for_beekeeper(user_id)
        return RescueOfferModel.list_for_citizen(user_id)

    # ── RESPOND (citizen: accept/reject) ────────
    @staticmethod
    def respond(citizen_id: str, offer_id: str, action: str) -> dict:
        offer = RescueOfferModel.find_with_context(offer_id)
        if not offer:
            raise ValueError("Offer not found.")
        if offer["citizenID"] != citizen_id:
            raise PermissionError("This offer is not on your report.")
        if offer["offer_status"] != "Pending":
            raise ValueError(f"Offer is already {offer['offer_status']}.")

        if action != "accept":
            updated = RescueOfferModel.update_status(offer_id, "Rejected", expected_status="Pending")
            if not updated:
                raise ValueError("Offer status changed before this action could be applied.")
            NotificationService.notify_many([
                NotificationService.offer_update_item(
                    beekeeper_id=offer["beekeeperID"],
                    report_id=offer["report_id"],
                    title="Offer Not Accepted",
                    message=f"The citizen declined your offer on report {offer['report_id']}.",
                )
            ])
            return RescueOfferModel.find_with_context(offer_id)

        # ACCEPT — one transaction so the report can never end up with
        # two accepted beekeepers:
        #   1. this offer          Pending -> Accepted
        #   2. other pending offers on the same report -> Rejected
        #   3. the report          Pending -> In Progress
        report_id = offer["report_id"]
        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1 FROM rescue_offers
                    WHERE report_id = %s AND offer_status IN ('Accepted', 'Resolved')
                    LIMIT 1
                    """,
                    (report_id,),
                )
                if cur.fetchone():
                    raise ValueError("You already accepted another beekeeper's offer for this report.")

                cur.execute(
                    """
                    UPDATE rescue_offers
                    SET offer_status = 'Accepted'
                    WHERE offer_id = %s AND offer_status = 'Pending'
                    """,
                    (offer_id,),
                )
                if cur.rowcount == 0:
                    raise ValueError("Offer status changed before this action could be applied.")

                # Remember who gets auto-rejected, to notify them after commit.
                cur.execute(
                    """
                    SELECT DISTINCT beekeeperID FROM rescue_offers
                    WHERE report_id = %s AND offer_id <> %s AND offer_status = 'Pending'
                    """,
                    (report_id, offer_id),
                )
                others = [r["beekeeperID"] for r in (cur.fetchall() or [])]

                cur.execute(
                    """
                    UPDATE rescue_offers
                    SET offer_status = 'Rejected'
                    WHERE report_id = %s AND offer_id <> %s AND offer_status = 'Pending'
                    """,
                    (report_id, offer_id),
                )

                cur.execute(
                    """
                    UPDATE reports
                    SET status = 'In Progress'
                    WHERE reportID = %s AND status = 'Pending'
                    """,
                    (report_id,),
                )
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        NotificationService.notify_many(
            [
                NotificationService.offer_update_item(
                    beekeeper_id=offer["beekeeperID"],
                    report_id=report_id,
                    title="Offer Accepted!",
                    message=f"The citizen accepted your offer on report {report_id}. "
                            f"Message them to arrange the rescue.",
                )
            ]
            + [
                NotificationService.offer_update_item(
                    beekeeper_id=bk_id,
                    report_id=report_id,
                    title="Offer Not Accepted",
                    message=f"The citizen chose another beekeeper for report {report_id}.",
                )
                for bk_id in others
                if bk_id != offer["beekeeperID"]
            ]
        )

        return RescueOfferModel.find_with_context(offer_id)

    # ── RESOLVE (either party marks the job done) ─
    @staticmethod
    def resolve(role: str, user_id: str, offer_id: str) -> dict:
        offer = RescueOfferModel.find_with_context(offer_id)
        if not offer:
            raise ValueError("Offer not found.")

        is_owner = (
            (role == "citizen" and offer["citizenID"] == user_id)
            or (role == "beekeeper" and offer["beekeeperID"] == user_id)
        )
        if not is_owner:
            raise PermissionError("You are not a party to this offer.")
        if offer["offer_status"] != "Accepted":
            raise ValueError("Only an Accepted offer can be marked Resolved.")

        conn = Database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE rescue_offers
                    SET offer_status = 'Resolved', resolved_at = CURRENT_TIMESTAMP
                    WHERE offer_id = %s AND offer_status = 'Accepted'
                    """,
                    (offer_id,),
                )
                if cur.rowcount == 0:
                    raise ValueError("Offer status changed before it could be resolved.")
            ReportModel.mark_resolved(conn, offer["report_id"])
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        # Tell whoever DIDN'T mark it done (migration 012 for citizens).
        if role == "beekeeper":
            item = NotificationService.rescue_resolved_item(
                report_id=offer["report_id"],
                citizen_id=offer.get("citizenID"),
                other_name=offer.get("beekeeper_name"),
            )
        else:
            item = NotificationService.rescue_resolved_item(
                report_id=offer["report_id"],
                beekeeper_id=offer.get("beekeeperID"),
            )
        if item.get("citizen_id") or item.get("beekeeper_id"):
            NotificationService.notify_many([item])

        return RescueOfferModel.find_with_context(offer_id)