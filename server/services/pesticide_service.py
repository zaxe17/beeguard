# services/pesticide_service.py

"""
PEWS — Pesticide Early Warning System (Feature 4).

An alert can be authored two ways:
  - By an ADMIN (source="admin") — the original official/LGU flow.
  - By a BEEKEEPER self-reporting pesticide activity they're aware of
    (source="beekeeper") — goes live immediately, same fan-out as an
    admin alert, no separate admin confirmation/approval step.

Either way, we compute the danger radius (explicit override or
per-pesticide-type default), find every beekeeper within that radius
using the `geopy` library's geodesic distance calculation (WGS-84
ellipsoid model), and fan out an alert_recipients row + notification
per match — all inside one transaction so an alert never exists
without its recipient list, or vice-versa.

Risk level has two layers:
  - alerts.risk_level — a single global severity the creator (admin or
    self-reporting beekeeper) picks for the alert as a whole.
  - alert_recipients.risk_level — PER-RECIPIENT, computed from how
    close that beekeeper's own farm is to the pesticide site relative
    to the danger radius (see _risk_level_for_distance).

    Rule (kapag sobrang lapit → High, sakto lang → Medium, sobrang
    layo → Low):
        distance <= radius / 3           -> High   (very close)
        distance <= 2 * radius / 3       -> Medium (moderately close)
        distance >  2 * radius / 3       -> Low    (far / outside)

  A beekeeper who is NOT matched as a recipient at all (outside the
  danger radius entirely) is never at real personal risk, regardless
  of the alert's global risk_level — every beekeeper-facing read
  (list_active, list_for_beekeeper, get_alert_detail) personalizes to
  "Low" in that case rather than falling back to the creator's global
  severity. The global risk_level is only ever shown to admins, who
  have no single farm to compute a personal distance against.

Alert *detail* reads (get_alert_detail) are shaped with a `pydantic`
schema (schemas/alert_schema.py) so numeric DB types (DECIMAL columns
come back as Decimal/str depending on driver config) are normalized to
real JSON numbers before they ever reach the frontend.
"""
from geopy.distance import geodesic

from config.database import Database
from models.alert import AlertModel
from models.alert_recipient import AlertRecipientModel
from models.notification import NotificationModel
from models.beekeeper import BeekeeperModel
from schemas.alert_schema import AlertDetailOut


# Per-type radius defaults (confirmed decision)
RADIUS_KM_BY_TYPE = {
    "Insecticide": 5.0,
    "Herbicide":   3.0,
    "Fungicide":   3.0,
}
DEFAULT_RADIUS_KM = 3.0


def _default_radius(pesticide_type: str | None) -> float:
    if pesticide_type and pesticide_type in RADIUS_KM_BY_TYPE:
        return RADIUS_KM_BY_TYPE[pesticide_type]
    return DEFAULT_RADIUS_KM


def _risk_level_for_distance(distance_km: float, radius_km: float) -> str:
    """
    Distance-based personal risk rule (thirds-of-radius):
        very near      (distance <= radius / 3)      -> High
        moderately near(distance <= 2 * radius / 3)  -> Medium
        far (including outside the danger radius)    -> Low

    Latitude and longitude are converted to an actual geodesic
    distance in _find_nearby_beekeepers BEFORE this function is
    called. Never compare raw latitude/longitude differences: one
    degree of longitude varies by latitude.

    Edge cases:
      - radius_km <= 0        -> "Low" (bad data, don't panic anyone).
      - distance_km <= 0      -> "High" (same pin / rounding to zero).
      - distance_km is None   -> "Low" (unlocated beekeeper — the
        caller normally handles this separately, but be safe).
    """
    if radius_km is None or radius_km <= 0:
        return "Low"
    if distance_km is None:
        return "Low"
    if distance_km <= 0:
        return "High"
    ratio = distance_km / radius_km
    if ratio <= 1 / 3:
        return "High"
    if ratio <= 2 / 3:
        return "Medium"
    return "Low"


class PesticideService:

    @staticmethod
    def _find_nearby_beekeepers(conn, lat: float, lng: float, radius_km: float,
                                exclude_beekeeper_id: str | None = None):
        """
        Returns (matched, unlocated, other_ids).

        - matched:  beekeepers within radius_km with a real distance.
        - unlocated: beekeepers with NULL lat/lng (we can't compute a
          distance for them, but we still want them to hear about the
          alert so they know to fix their farm location).
        - other_ids: id set of every OTHER beekeeper on the platform
          (excluding the reporter). Used so a beekeeper outside the
          danger radius still gets a courtesy heads-up notification;
          only "matched" recipients become alert_recipients rows.

        `exclude_beekeeper_id` — when a beekeeper self-reports, we
        don't want to fan an alert notification back to them as if
        they were a matched recipient (they already get a dedicated
        "Alert Published" confirmation). Passing their id here strips
        them from all three return lists.
        """
        sql = """
            SELECT beekeeperID, latitude, longitude
            FROM beekeepers
            WHERE deleted_at IS NULL
        """
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        origin = (float(lat), float(lng))
        matched, unlocated, other_ids = [], [], []
        for row in rows:
            bk_id = row["beekeeperID"]
            if exclude_beekeeper_id and bk_id == exclude_beekeeper_id:
                continue

            if row["latitude"] is None or row["longitude"] is None:
                unlocated.append(row)
                continue

            candidate = (float(row["latitude"]), float(row["longitude"]))
            distance_km = geodesic(origin, candidate).km
            if distance_km <= radius_km:
                row["distance_km"] = distance_km
                matched.append(row)
            else:
                # Beekeeper is on the platform but outside the danger
                # radius — they still deserve a courtesy heads-up.
                other_ids.append(bk_id)

        matched.sort(key=lambda r: r["distance_km"])
        return matched, unlocated, other_ids

    @staticmethod
    def create_alert(actor_id: str, actor_role: str, cleaned: dict) -> dict:
        """
        actor_role: "admin" or "beekeeper" — determines which author
        column gets filled and how the notification message reads.
        Beekeeper-authored alerts publish immediately, same as admin
        ones — there is no separate approval/confirmation step.

        Notification fan-out rules:
          - MATCHED beekeepers (within radius) get a personalized
            distance/risk notification AND an alert_recipients row.
          - UNLOCATED beekeepers (no farm pin yet) get a "please set
            your location" notification AND a recipient row with
            distance_km=NULL, risk_level=Low.
          - OTHER beekeepers on the platform (outside the radius) get
            a courtesy heads-up notification so they can still open
            the alert details — but NO alert_recipients row (they
            aren't in the danger zone). This is what makes the
            "sent to N beekeepers" count reflect everyone who was
            actually notified, not just those inside the circle.
          - The REPORTER themselves is never counted as a recipient
            — they get a dedicated "Alert Published" confirmation.
        """
        radius = float(
            cleaned.get("danger_radius_km")
            or _default_radius(cleaned.get("pesticide_type"))
        )

        is_beekeeper_authored = actor_role == "beekeeper"
        reporter_name = None
        if is_beekeeper_authored:
            reporter = BeekeeperModel.find_by_id(actor_id)
            reporter_name = (reporter or {}).get("name")

        exclude_id = actor_id if is_beekeeper_authored else None

        conn = Database.get_connection()
        try:
            alert_id = AlertModel.insert_with_conn(conn, {
                "source":                   "beekeeper" if is_beekeeper_authored else "admin",
                "admin_id":                 None if is_beekeeper_authored else actor_id,
                "reported_by_beekeeper_id": actor_id if is_beekeeper_authored else None,
                "title":              cleaned["title"],
                "description":        cleaned.get("description"),
                "pesticide_type":     cleaned.get("pesticide_type"),
                "application_method": cleaned.get("application_method"),
                "affected_area":      cleaned.get("affected_area"),
                "latitude":           cleaned["latitude"],
                "longitude":          cleaned["longitude"],
                "scheduled_date":     cleaned["scheduled_date"],
                "expiration_date":    cleaned.get("expiration_date"),
                "danger_radius_km":   radius,
                "risk_level":         cleaned.get("risk_level", "Medium"),
            })

            matched, unlocated, other_ids = PesticideService._find_nearby_beekeepers(
                conn, cleaned["latitude"], cleaned["longitude"], radius,
                exclude_beekeeper_id=exclude_id,
            )

            source_phrase = (
                f"reported by a fellow beekeeper{f' ({reporter_name})' if reporter_name else ''}"
                if is_beekeeper_authored
                else "issued"
            )

            recipients = []
            notified_ids = set()

            # 1) In-radius (matched) — real distance + real risk.
            #    Kapag sobrang lapit → High, sakto → Medium, malayo → Low.
            for row in matched:
                bk_id = row["beekeeperID"]
                distance = float(row["distance_km"])
                recipient_risk = _risk_level_for_distance(distance, radius)

                nid = NotificationModel.insert_with_conn(conn, {
                    "beekeeper_id":      bk_id,
                    "alert_id":          alert_id,
                    "report_id":         None,
                    "title":             f"Pesticide Alert: {cleaned['title']}",
                    "message": (
                        f"A {cleaned.get('pesticide_type') or 'pesticide'} application "
                        f"({source_phrase}) is scheduled within {radius:.1f} km of your "
                        f"apiary (approx. {distance:.2f} km away). Risk level: "
                        f"{recipient_risk}."
                    ),
                    "notification_type": "pesticide_alert",
                })

                rid = AlertRecipientModel.insert_with_conn(conn, {
                    "alert_id":        alert_id,
                    "beekeeper_id":    bk_id,
                    "distance_km":     round(distance, 2),
                    "risk_level":      recipient_risk,
                    "notification_id": nid,
                })
                recipients.append({
                    "recipient_id": rid,
                    "beekeeper_id": bk_id,
                    "distance_km":  round(distance, 2),
                    "risk_level":   recipient_risk,
                })
                notified_ids.add(bk_id)

            # 2) Unlocated — no farm pin, can't compute distance. We
            #    still notify them AND write a recipient row so the
            #    alert shows up on their /alerts/mine feed.
            for row in unlocated:
                bk_id = row["beekeeperID"]

                nid = NotificationModel.insert_with_conn(conn, {
                    "beekeeper_id": bk_id,
                    "alert_id": alert_id,
                    "report_id": None,
                    "title": f"Pesticide Alert: {cleaned['title']}",
                    "message": (
                        f"A {cleaned.get('pesticide_type') or 'pesticide'} application "
                        f"({source_phrase}) has been reported. Your apiary location "
                        f"is not yet set, so we couldn't determine whether you're "
                        f"within the danger radius. Please update your farm location "
                        f"to receive personalized risk alerts."
                    ),
                    "notification_type": "pesticide_alert",
                })

                rid = AlertRecipientModel.insert_with_conn(conn, {
                    "alert_id": alert_id,
                    "beekeeper_id": bk_id,
                    "distance_km": None,
                    "risk_level": "Low",
                    "notification_id": nid,
                })

                recipients.append({
                    "recipient_id": rid,
                    "beekeeper_id": bk_id,
                    "distance_km": None,
                    "risk_level": "Low",
                })
                notified_ids.add(bk_id)

            # 3) Other beekeepers (outside radius) — courtesy heads-up
            #    notification only. NO alert_recipients row: they're
            #    not in the danger zone, so their /alerts/mine feed
            #    shouldn't treat this as a personal alert. But the
            #    notification links to the alert details so they can
            #    open it if they're curious.
            for bk_id in other_ids:
                NotificationModel.insert_with_conn(conn, {
                    "beekeeper_id":      bk_id,
                    "alert_id":          alert_id,
                    "report_id":         None,
                    "title":             f"Pesticide Alert: {cleaned['title']}",
                    "message": (
                        f"A {cleaned.get('pesticide_type') or 'pesticide'} application "
                        f"({source_phrase}) has been posted in your area. Your apiary "
                        f"is outside the {radius:.1f} km danger radius, so no direct "
                        f"action is required — tap to view details."
                    ),
                    "notification_type": "pesticide_alert",
                })
                notified_ids.add(bk_id)

            # Always notify the reporter's OWN account that their
            # alert was published. The count reflects EVERY other
            # beekeeper we notified — matched + unlocated + other —
            # not just those inside the radius, so a small platform
            # doesn't misleadingly say "0 nearby beekeepers".
            #
            # The reporter is deliberately excluded from `matched` above
            # (see `exclude_id`) so they don't get double-notified as if
            # they were a stranger recipient. But that also meant they
            # NEVER got an alert_recipients row for their own alert, so
            # their own list/detail views always fell back to "Low" —
            # even when they set the alert right on top of their own
            # farm. We fix that here: compute the reporter's own
            # distance to the alert (same thirds-of-radius rule as
            # everyone else) and give them a real recipient row too.
            if is_beekeeper_authored:
                total_notified = len(notified_ids)
                matched_count = sum(1 for r in recipients if r.get("distance_km") is not None)
                if matched_count > 0:
                    detail = f"{matched_count} of them are inside the {radius:.1f} km danger radius."
                else:
                    detail = f"None of them are inside the {radius:.1f} km danger radius."

                own_distance = None
                own_risk = "Low"
                reporter_lat = (reporter or {}).get("latitude")
                reporter_lng = (reporter or {}).get("longitude")
                if reporter_lat is not None and reporter_lng is not None:
                    origin = (float(cleaned["latitude"]), float(cleaned["longitude"]))
                    own_point = (float(reporter_lat), float(reporter_lng))
                    own_distance = geodesic(origin, own_point).km
                    own_risk = _risk_level_for_distance(own_distance, radius)
                    own_detail = (
                        f" Your own apiary is approx. {own_distance:.2f} km from the "
                        f"site (risk level: {own_risk})."
                    )
                else:
                    own_detail = (
                        " Your apiary location isn't set, so we couldn't compute your "
                        "own risk level — please update your farm location."
                    )

                nid = NotificationModel.insert_with_conn(conn, {
                    "beekeeper_id":      actor_id,
                    "alert_id":          alert_id,
                    "report_id":         None,
                    "title":             "Alert Published",
                    "message": (
                        f"Your pesticide alert \"{cleaned['title']}\" has been "
                        f"published and sent to {total_notified} beekeeper(s). "
                        f"{detail}{own_detail}"
                    ),
                    "notification_type": "pesticide_alert",
                })

                rid = AlertRecipientModel.insert_with_conn(conn, {
                    "alert_id":        alert_id,
                    "beekeeper_id":    actor_id,
                    "distance_km":     round(own_distance, 2) if own_distance is not None else None,
                    "risk_level":      own_risk,
                    "notification_id": nid,
                })
                recipients.append({
                    "recipient_id": rid,
                    "beekeeper_id": actor_id,
                    "distance_km":  round(own_distance, 2) if own_distance is not None else None,
                    "risk_level":   own_risk,
                })

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return {
            "alert_id":         alert_id,
            "danger_radius_km": radius,
            "matched_count":    sum(1 for r in recipients if r.get("distance_km") is not None),
            "notified_count":   len(notified_ids),
            "recipients":       recipients,
        }

    # ── Read-side ─────────────────────────────
    @staticmethod
    def list_for_admin(admin_id: str):
        return AlertModel.list_for_admin(admin_id)

    @staticmethod
    def list_active(beekeeper_id: str | None = None):
        return AlertModel.list_active(beekeeper_id=beekeeper_id)

    @staticmethod
    def list_for_beekeeper(beekeeper_id: str):
        return AlertModel.list_for_beekeeper(beekeeper_id)

    @staticmethod
    def recipients_for_alert(alert_id: str):
        return AlertRecipientModel.list_for_alert(alert_id)

    @staticmethod
    def get_alert_detail(alert_id: str, actor_id: str, actor_role: str) -> dict:
        """
        Powers the Alert Details page. Raises:
          LookupError    — no such alert (route maps this to 404)

        Access rules (relaxed):
          - admin: can view any alert.
          - beekeeper: can view ANY alert. A pesticide alert is a
            public-safety notice — every beekeeper on the platform
            should be able to open its full detail page, even if they
            weren't matched as a recipient.

        risk_level in the response is personalized for a beekeeper
        viewer:
          - Matched as recipient -> their own distance-derived severity
            + distance in km.
          - Beekeeper viewing (author or otherwise) but NOT matched as
            a recipient -> "Low" — being outside the alert's own danger
            radius means it isn't a real personal threat, regardless
            of the alert's global risk_level.
          - Admin viewer -> the alert's global risk_level (no single
            beekeeper's farm to compute a personal distance against).
        """
        row = AlertModel.find_detail_by_id(alert_id)
        if not row:
            raise LookupError(alert_id)

        recipient_row = None
        if actor_role == "beekeeper":
            recipient_row = AlertRecipientModel.get_for_beekeeper(alert_id, actor_id)

        is_beekeeper_authored = row["source"] == "beekeeper"
        if is_beekeeper_authored:
            issued_by = row.get("reporter_name") or "Fellow beekeeper"
            contact = row.get("reporter_contact")
        else:
            issued_by = row.get("admin_name") or "BeeGuard Admin"
            contact = row.get("admin_contact")

        lat = float(row["latitude"])
        lng = float(row["longitude"])
        location = row.get("affected_area") or f"{lat:.4f}, {lng:.4f}"

        if actor_role == "beekeeper":
            effective_risk = recipient_row["risk_level"] if recipient_row else "Low"
        else:
            effective_risk = row.get("risk_level") or "Medium"

        your_distance_km = None
        if recipient_row and recipient_row.get("distance_km") is not None:
            your_distance_km = float(recipient_row["distance_km"])

        detail = AlertDetailOut(
            alert_id=row["alert_id"],
            title=row["title"],
            source=row["source"],
            status=effective_risk.lower(),
            location=location,
            latitude=lat,
            longitude=lng,
            pesticide_type=row.get("pesticide_type"),
            application_method=row.get("application_method"),
            description=row.get("description"),
            danger_radius_km=row["danger_radius_km"],
            scheduled_date=row["scheduled_date"],
            expiration_date=row.get("expiration_date"),
            created_at=row["created_at"],
            issued_by=issued_by,
            contact=contact,
            your_distance_km=your_distance_km,
        )
        return detail.to_json()