# services/pesticide_service.py

"""
PEWS — Pesticide Early Warning System (Feature 4).

An alert can be authored two ways:
  - By an ADMIN (source="admin") — the original official/LGU flow.
    Approved and sent out immediately.
  - By a BEEKEEPER self-reporting pesticide activity they're aware of
    (source="beekeeper") — saved as approval_status='Pending'. It is
    NOT shown to other beekeepers and nobody is notified until an
    admin approves it (approve_alert). A rejected alert stays hidden
    and the beekeeper is told why (reject_alert).

When an alert goes out (admin create, or admin approval), we compute
the danger radius (explicit override or per-pesticide-type default),
find every beekeeper within that radius
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
from models.alert import (
    AlertModel,
    APPROVAL_APPROVED,
    APPROVAL_PENDING,
    APPROVAL_REJECTED,
)
from models.alert_recipient import AlertRecipientModel
from models.notification import NotificationModel
from services.notification_service import NotificationService, TYPE_ADMIN_ALERT_REVIEW
from models.beekeeper import BeekeeperModel
from schemas.alert_schema import AlertDetailOut
from utils.place_name import reverse_place_name


# Per-type radius defaults (confirmed decision)
RADIUS_KM_BY_TYPE = {
    "Insecticide": 5.0,
    "Herbicide":   3.0,
    "Fungicide":   3.0,
}
DEFAULT_RADIUS_KM = 3.0
REJECTION_REASON_MAX_LEN = 255

# For picking the alert's overall risk = the HIGHEST personal risk any
# beekeeper faces (what the admin sees; each beekeeper still sees their own).
_RISK_ORDER = {"Low": 0, "Medium": 1, "High": 2}


def _worst_risk(levels) -> str:
    """Highest of the given risk levels; "Low" when there are none."""
    worst = "Low"
    for level in levels:
        if level and _RISK_ORDER.get(level, 0) > _RISK_ORDER[worst]:
            worst = level
    return worst


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
        actor_role: "admin" or "beekeeper".

          - admin     -> approval_status 'Approved', sent out right away
                         (see _fan_out).
          - beekeeper -> approval_status 'Pending'. Nothing is sent to
                         other beekeepers yet; the reporter gets an
                         "Alert Submitted" notification. An admin then
                         approves (-> _fan_out) or rejects it.
        """
        radius = float(
            cleaned.get("danger_radius_km")
            or _default_radius(cleaned.get("pesticide_type"))
        )

        is_beekeeper_authored = actor_role == "beekeeper"

        # Save the place as "Barangay, City" in affected_area now, so
        # every page shows it instantly (no slow lookup in the browser).
        # Done before opening the DB connection; None if it can't be found.
        affected_area = cleaned.get("affected_area") or reverse_place_name(
            cleaned["latitude"], cleaned["longitude"]
        )

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
                "affected_area":      affected_area,
                "latitude":           cleaned["latitude"],
                "longitude":          cleaned["longitude"],
                "scheduled_date":     cleaned["scheduled_date"],
                "expiration_date":    cleaned.get("expiration_date"),
                "danger_radius_km":   radius,
                "risk_level":         cleaned.get("risk_level", "Medium"),
                "approval_status": (
                    APPROVAL_PENDING if is_beekeeper_authored else APPROVAL_APPROVED
                ),
            })

            if is_beekeeper_authored:
                # Waiting for an admin — only the reporter hears about it.
                NotificationModel.insert_with_conn(conn, {
                    "beekeeper_id":      actor_id,
                    "alert_id":          alert_id,
                    "report_id":         None,
                    "title":             "Alert Submitted",
                    "message": (
                        f"Your pesticide alert \"{cleaned['title']}\" was sent to the "
                        f"admin for review. It will be shown to other beekeepers "
                        f"once it's approved."
                    ),
                    "notification_type": "pesticide_alert",
                })
                # Admins: an alert is waiting for their approval (bell +
                # push). Same transaction — no alert, no notification.
                reporter = BeekeeperModel.find_by_id(actor_id) or {}
                where = affected_area or f"{cleaned['latitude']:.4f}, {cleaned['longitude']:.4f}"
                for item in NotificationService.admin_items(
                    title="Alert Needs Approval",
                    message=(
                        f"{reporter.get('name') or 'A beekeeper'} reported "
                        f"{cleaned.get('pesticide_type') or 'pesticide'} spraying at "
                        f"{where}. Approve or reject it."
                    ),
                    notification_type=TYPE_ADMIN_ALERT_REVIEW,
                    alert_id=alert_id,
                    conn=conn,
                ):
                    NotificationModel.insert_with_conn(conn, item)

                result = {
                    "alert_id":         alert_id,
                    "approval_status":  APPROVAL_PENDING,
                    "danger_radius_km": radius,
                    "matched_count":    0,
                    "notified_count":   0,
                    "recipients":       [],
                }
            else:
                result = PesticideService._fan_out(conn, alert_id, {
                    "title":            cleaned["title"],
                    "pesticide_type":   cleaned.get("pesticide_type"),
                    "latitude":         cleaned["latitude"],
                    "longitude":        cleaned["longitude"],
                    "danger_radius_km": radius,
                }, reporter_id=None)
                result["approval_status"] = APPROVAL_APPROVED

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return result

    # ── ADMIN REVIEW (beekeeper-reported alerts) ──
    @staticmethod
    def list_for_review(status: str | None = None):
        """
        Admin Alerts page. Approved alerts already have their overall
        risk saved (highest risk among beekeepers — see _fan_out).
        Pending ones haven't been sent yet, so their risk is PREVIEWED
        here the same way: the highest risk any beekeeper would face
        (the reporter included) if the admin approves it.
        """
        rows = AlertModel.list_for_review(status)
        pending = [r for r in rows if r.get("approval_status") == APPROVAL_PENDING]
        if pending:
            beekeepers = Database.execute(
                "SELECT latitude, longitude FROM beekeepers "
                "WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL",
                (),
                fetchall=True,
            ) or []
            farms = [(float(b["latitude"]), float(b["longitude"])) for b in beekeepers]
            for row in pending:
                origin = (float(row["latitude"]), float(row["longitude"]))
                radius = float(row["danger_radius_km"])
                distances = (geodesic(origin, farm).km for farm in farms)
                row["risk_level"] = _worst_risk(
                    _risk_level_for_distance(d, radius) for d in distances if d <= radius
                )
        return rows

    @staticmethod
    def count_pending() -> int:
        return AlertModel.count_pending()

    @staticmethod
    def approve_alert(alert_id: str, admin_id: str) -> dict:
        """
        Pending -> Approved, then sends the alert out exactly like a
        freshly published one (_fan_out). Raises:
          LookupError — no such alert
          ValueError  — already approved / rejected
        """
        conn = Database.get_connection()
        try:
            alert = AlertModel.find_by_id_for_update(conn, alert_id)
            if not alert:
                raise LookupError(alert_id)
            if alert["approval_status"] != APPROVAL_PENDING:
                raise ValueError(
                    f"This alert was already {alert['approval_status'].lower()}."
                )

            AlertModel.set_approval_with_conn(conn, alert_id, APPROVAL_APPROVED, admin_id)
            result = PesticideService._fan_out(conn, alert_id, {
                "title":            alert["title"],
                "pesticide_type":   alert.get("pesticide_type"),
                "latitude":         float(alert["latitude"]),
                "longitude":        float(alert["longitude"]),
                "danger_radius_km": float(alert["danger_radius_km"]),
            }, reporter_id=alert.get("reported_by_beekeeper_id"))
            result["approval_status"] = APPROVAL_APPROVED

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        return result

    @staticmethod
    def reject_alert(alert_id: str, admin_id: str, reason: str) -> dict:
        """
        Pending -> Rejected. The alert stays hidden from everyone but
        its reporter, who is notified with the reason. Raises:
          LookupError — no such alert
          ValueError  — bad reason / already reviewed
        """
        reason = (reason or "").strip()
        if not reason:
            raise ValueError("Please give a reason for rejecting this alert.")
        if len(reason) > REJECTION_REASON_MAX_LEN:
            raise ValueError(
                f"Reason must be {REJECTION_REASON_MAX_LEN} characters or fewer."
            )

        conn = Database.get_connection()
        try:
            alert = AlertModel.find_by_id_for_update(conn, alert_id)
            if not alert:
                raise LookupError(alert_id)
            if alert["approval_status"] != APPROVAL_PENDING:
                raise ValueError(
                    f"This alert was already {alert['approval_status'].lower()}."
                )

            AlertModel.set_approval_with_conn(
                conn, alert_id, APPROVAL_REJECTED, admin_id, rejection_reason=reason
            )

            reporter_id = alert.get("reported_by_beekeeper_id")
            if reporter_id:
                NotificationModel.insert_with_conn(conn, {
                    "beekeeper_id":      reporter_id,
                    "alert_id":          alert_id,
                    "report_id":         None,
                    "title":             "Alert Rejected",
                    "message": (
                        f"Your pesticide alert \"{alert['title']}\" was not approved. "
                        f"Reason: {reason}"
                    ),
                    "notification_type": "pesticide_alert",
                })

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return {
            "alert_id":         alert_id,
            "approval_status":  APPROVAL_REJECTED,
            "rejection_reason": reason,
        }

    # ── SEND AN ALERT OUT ─────────────────────
    @staticmethod
    def _fan_out(conn, alert_id: str, alert: dict, reporter_id: str | None) -> dict:
        """
        Runs inside the caller's transaction when an alert goes live
        (admin creates one, or approves a beekeeper's).

        alert: title, pesticide_type, latitude, longitude, danger_radius_km.
        reporter_id: the beekeeper who reported it (None for admin alerts).

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
            — they get a dedicated "Alert Approved" notification.
        """
        radius = float(alert["danger_radius_km"])
        is_beekeeper_authored = reporter_id is not None
        reporter = BeekeeperModel.find_by_id(reporter_id) if is_beekeeper_authored else None
        reporter_name = (reporter or {}).get("name")

        matched, unlocated, other_ids = PesticideService._find_nearby_beekeepers(
            conn, alert["latitude"], alert["longitude"], radius,
            exclude_beekeeper_id=reporter_id,
        )

        source_phrase = (
            f"reported by a fellow beekeeper{f' ({reporter_name})' if reporter_name else ''}"
            if is_beekeeper_authored
            else "issued"
        )
        pesticide_name = alert.get("pesticide_type") or "pesticide"

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
                "title":             f"Pesticide Alert: {alert['title']}",
                "message": (
                    f"A {pesticide_name} application "
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
                "title": f"Pesticide Alert: {alert['title']}",
                "message": (
                    f"A {pesticide_name} application "
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
        #    notification only. NO alert_recipients row.
        for bk_id in other_ids:
            NotificationModel.insert_with_conn(conn, {
                "beekeeper_id":      bk_id,
                "alert_id":          alert_id,
                "report_id":         None,
                "title":             f"Pesticide Alert: {alert['title']}",
                "message": (
                    f"A {pesticide_name} application "
                    f"({source_phrase}) has been posted in your area. Your apiary "
                    f"is outside the {radius:.1f} km danger radius, so no direct "
                    f"action is required — tap to view details."
                ),
                "notification_type": "pesticide_alert",
            })
            notified_ids.add(bk_id)

        # 4) The reporter (beekeeper alerts only): "Alert Approved" with
        #    how many beekeepers were notified, plus their own recipient
        #    row with their real distance/risk (same thirds-of-radius
        #    rule as everyone else) so their own views aren't stuck on
        #    "Low" when the alert sits right on top of their farm.
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
                origin = (float(alert["latitude"]), float(alert["longitude"]))
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
                "beekeeper_id":      reporter_id,
                "alert_id":          alert_id,
                "report_id":         None,
                "title":             "Alert Approved",
                "message": (
                    f"Your pesticide alert \"{alert['title']}\" was approved by the "
                    f"admin and sent to {total_notified} beekeeper(s). "
                    f"{detail}{own_detail}"
                ),
                "notification_type": "pesticide_alert",
            })

            rid = AlertRecipientModel.insert_with_conn(conn, {
                "alert_id":        alert_id,
                "beekeeper_id":    reporter_id,
                "distance_km":     round(own_distance, 2) if own_distance is not None else None,
                "risk_level":      own_risk,
                "notification_id": nid,
            })
            recipients.append({
                "recipient_id": rid,
                "beekeeper_id": reporter_id,
                "distance_km":  round(own_distance, 2) if own_distance is not None else None,
                "risk_level":   own_risk,
            })

        # The alert's overall risk = the highest risk any beekeeper with a
        # known farm location faces (unlocated ones are always "Low").
        # This is what the admin sees; beekeepers keep their own level.
        overall_risk = _worst_risk(
            r["risk_level"] for r in recipients if r.get("distance_km") is not None
        )
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {AlertModel.TABLE} SET risk_level = %s WHERE alert_id = %s",
                (overall_risk, alert_id),
            )

        return {
            "alert_id":         alert_id,
            "danger_radius_km": radius,
            "risk_level":       overall_risk,
            "matched_count":    sum(1 for r in recipients if r.get("distance_km") is not None),
            "notified_count":   len(notified_ids),
            "recipients":       recipients,
        }

    # ── Read-side ─────────────────────────────
    @staticmethod
    def list_for_admin(admin_id: str):
        return AlertModel.list_for_admin(admin_id)

    @staticmethod
    def list_active(beekeeper_id: str | None = None, include_past: bool = False):
        return AlertModel.list_active(
            limit=300 if include_past else 100,
            beekeeper_id=beekeeper_id,
            include_past=include_past,
        )

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
          - Pending / Rejected alerts: only admins and the reporter.
          - beekeeper: can view ANY approved alert. A pesticide alert is a
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

        # Not approved yet (or rejected): only admins and the beekeeper
        # who reported it can open it — everyone else gets "not found".
        approval_status = row.get("approval_status") or APPROVAL_APPROVED
        if (
            approval_status != APPROVAL_APPROVED
            and actor_role != "admin"
            and row.get("reported_by_beekeeper_id") != actor_id
        ):
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
        out = detail.to_json()
        if isinstance(out, dict):
            out["approval_status"] = approval_status
            out["rejection_reason"] = row.get("rejection_reason")
        return out