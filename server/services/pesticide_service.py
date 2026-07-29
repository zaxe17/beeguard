"""
PEWS — Pesticide Early Warning System (Feature 4).

Admin creates a broadcast alert; we compute the danger radius
(explicit override or per-pesticide-type default), find every
beekeeper within that radius using a pure-SQL Haversine query,
and fan out an alert_recipients row + notification per match —
all inside one transaction so an alert never exists without its
recipient list, or vice-versa.
"""
from config.database import Database
from models.alert import AlertModel
from models.alert_recipient import AlertRecipientModel
from models.notification import NotificationModel


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
        Pure SQL Haversine distance search (no GIS lib dependency —
        matches the confirmed 'pure Python + MySQL' approach).
        LEAST/GREATEST clamp guards against float rounding pushing
        the ACOS argument outside [-1, 1].
        """
        sql = """
            SELECT beekeeperID, latitude, longitude,
                (6371 * ACOS(
                    LEAST(1, GREATEST(-1,
                        COS(RADIANS(%s)) * COS(RADIANS(latitude)) *
                        COS(RADIANS(longitude) - RADIANS(%s)) +
                        SIN(RADIANS(%s)) * SIN(RADIANS(latitude))
                    ))
                )) AS distance_km
            FROM beekeepers
            WHERE deleted_at IS NULL
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
            HAVING distance_km <= %s
            ORDER BY distance_km ASC
        """
        with conn.cursor() as cur:
            cur.execute(sql, (lat, lng, lat, radius_km))
            return cur.fetchall()

    @staticmethod
    def create_alert(admin_id: str, cleaned: dict) -> dict:
        radius = cleaned.get("danger_radius_km") or _default_radius(cleaned.get("pesticide_type"))

        conn = Database.get_connection()
        try:
            alert_id = AlertModel.insert_with_conn(conn, {
                "admin_id":         admin_id,
                "beekeeper_id":     None,   # broadcast — no single target
                "title":            cleaned["title"],
                "pesticide_type":   cleaned.get("pesticide_type"),
                "affected_area":    cleaned.get("affected_area"),
                "latitude":         cleaned["latitude"],
                "longitude":        cleaned["longitude"],
                "scheduled_date":   cleaned["scheduled_date"],
                "expiration_date":  cleaned.get("expiration_date"),
                "danger_radius_km": radius,
                "risk_level":       cleaned.get("risk_level", "Medium"),
            })

            matched = PesticideService._find_nearby_beekeepers(
                conn, cleaned["latitude"], cleaned["longitude"], radius
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
                        f"is scheduled within {radius:.1f} km of your apiary "
                        f"(approx. {distance:.2f} km away). Risk level: "
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