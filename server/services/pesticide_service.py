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


class PesticideService:

    @staticmethod
    def _find_nearby_beekeepers(conn, lat: float, lng: float, radius_km: float):
        """
        Fetches every beekeeper with a saved location, then uses
        `geopy.distance.geodesic` to compute the real-world distance
        from the alert's coordinates to each one, filtering to those
        within `radius_km`.
        """
        sql = """
            SELECT beekeeperID, latitude, longitude
            FROM beekeepers
            WHERE deleted_at IS NULL
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
        """
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        origin = (lat, lng)
        matched = []
        for row in rows:
            candidate = (float(row["latitude"]), float(row["longitude"]))
            distance_km = geodesic(origin, candidate).km
            if distance_km <= radius_km:
                row["distance_km"] = distance_km
                matched.append(row)

        matched.sort(key=lambda r: r["distance_km"])
        return matched

    @staticmethod
    def create_alert(actor_id: str, actor_role: str, cleaned: dict) -> dict:
        """
        actor_role: "admin" or "beekeeper" — determines which author
        column gets filled and how the notification message reads.
        Beekeeper-authored alerts publish immediately, same as admin
        ones — there is no separate approval/confirmation step.
        """
        radius = cleaned.get("danger_radius_km") or _default_radius(cleaned.get("pesticide_type"))

        is_beekeeper_authored = actor_role == "beekeeper"
        reporter_name = None
        if is_beekeeper_authored:
            reporter = BeekeeperModel.find_by_id(actor_id)
            reporter_name = (reporter or {}).get("name")

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

            matched = PesticideService._find_nearby_beekeepers(
                conn, cleaned["latitude"], cleaned["longitude"], radius
            )

            # Wording differs slightly depending on who authored it, so
            # recipients know whether this is an official alert or a
            # fellow beekeeper's self-report.
            source_phrase = (
                f"reported by a fellow beekeeper{f' ({reporter_name})' if reporter_name else ''}"
                if is_beekeeper_authored
                else "issued"
            )

            recipients = []
            for row in matched:
                bk_id = row["beekeeperID"]
                distance = float(row["distance_km"])

                nid = NotificationModel.insert_with_conn(conn, {
                    "beekeeper_id":      bk_id,
                    "alert_id":          alert_id,
                    "report_id":         None,
                    "title":             f"Pesticide Alert: {cleaned['title']}",
                    "message": (
                        f"A {cleaned.get('pesticide_type') or 'pesticide'} application "
                        f"({source_phrase}) is scheduled within {radius:.1f} km of your "
                        f"apiary (approx. {distance:.2f} km away). Risk level: "
                        f"{cleaned.get('risk_level', 'Medium')}."
                    ),
                    "notification_type": "pesticide_alert",
                })

                rid = AlertRecipientModel.insert_with_conn(conn, {
                    "alert_id":        alert_id,
                    "beekeeper_id":    bk_id,
                    "distance_km":     round(distance, 2),
                    "notification_id": nid,
                })
                recipients.append({
                    "recipient_id": rid,
                    "beekeeper_id": bk_id,
                    "distance_km":  round(distance, 2),
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
            "matched_count":    len(recipients),
            "recipients":       recipients,
        }

    # ── Read-side ─────────────────────────────
    @staticmethod
    def list_for_admin(admin_id: str):
        return AlertModel.list_for_admin(admin_id)

    @staticmethod
    def list_active():
        return AlertModel.list_active()

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
          PermissionError — actor may not view this alert (route maps to 403)

        Access rules:
          - admin: can view any alert
          - beekeeper: can view it if they authored it (self-report) OR
            they were matched/notified as a recipient. A beekeeper who
            has no relation to the alert cannot look it up by guessing
            an alert_id.
        """
        row = AlertModel.find_detail_by_id(alert_id)
        if not row:
            raise LookupError(alert_id)

        if actor_role == "beekeeper":
            is_author = row.get("reported_by_beekeeper_id") == actor_id
            is_recipient = AlertRecipientModel.is_recipient(alert_id, actor_id)
            if not (is_author or is_recipient):
                raise PermissionError(actor_id)

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

        detail = AlertDetailOut(
            alert_id=row["alert_id"],
            title=row["title"],
            source=row["source"],
            status=(row.get("risk_level") or "Medium").lower(),
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
        )
        return detail.to_json()