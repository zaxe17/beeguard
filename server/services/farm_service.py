# services/farm_service.py
#
# "Bee Farm" browsing (BeefarmPage / BeefarmView on the frontend) is
# powered by the `beekeepers` table — there is no separate `farms`
# table. A "farm" IS a beekeeper account with a farm_name/address/pin.

from config.database import Database
from models.hive import HiveModel
from models.rating import RatingModel
from models.rescue_offer import RescueOfferModel
from models.follow import FollowModel
from services.photo_service import photo_url

try:
    from geopy.distance import geodesic
except ImportError:  # pragma: no cover — geopy is in requirements.txt
    geodesic = None


class FarmService:

    # ── LIST (BeefarmPage) ──────────────────────
    @staticmethod
    def list_farms(search: str | None = None, lat: float | None = None,
                    lng: float | None = None, limit: int = 50) -> list[dict]:
        clauses = ["deleted_at IS NULL", "status = 'Active'"]
        params: list = []
        if search:
            clauses.append("(farm_name LIKE %s OR name LIKE %s OR address LIKE %s)")
            like = f"%{search}%"
            params.extend([like, like, like])
        where = " AND ".join(clauses)

        sql = f"""
            SELECT beekeeperID, name, farm_name, address, latitude, longitude,
                   apiary_type, verification_status, farm_photo, profile_photo
            FROM beekeepers
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s
        """
        params.append(int(limit))
        rows = Database.execute(sql, tuple(params), fetchall=True) or []

        out = []
        for r in rows:
            rating = RatingModel.aggregate_for_beekeeper(r["beekeeperID"])
            distance_km = None
            if (
                lat is not None and lng is not None and geodesic is not None
                and r.get("latitude") is not None and r.get("longitude") is not None
            ):
                try:
                    distance_km = round(
                        geodesic((lat, lng), (float(r["latitude"]), float(r["longitude"]))).km,
                        1,
                    )
                except Exception:
                    distance_km = None

            out.append({
                "beekeeperID": r["beekeeperID"],
                "farmName": r.get("farm_name") or r["name"],
                "location": r.get("address") or "",
                "miles": distance_km,
                # Farm photo (Migration 019); None -> frontend default image.
                "image": photo_url(r.get("farm_photo")),
                "profile_photo": photo_url(r.get("profile_photo")),
                "rating_avg": rating["average"],
                "rating_count": rating["count"],
                "apiary_type": r.get("apiary_type"),
                # NEW — needed to plot the farm as a pin on BeefarmPage's
                # map. Omitted (null) for a beekeeper who hasn't set a
                # location yet, same nullability as the beekeepers table.
                "latitude": float(r["latitude"]) if r.get("latitude") is not None else None,
                "longitude": float(r["longitude"]) if r.get("longitude") is not None else None,
            })

        if lat is not None and lng is not None:
            out.sort(key=lambda f: (f["miles"] is None, f["miles"] or 0))

        return out

    # ── DETAIL (BeefarmView) ────────────────────
    @staticmethod
    def get_farm_detail(beekeeper_id: str, viewer_citizen_id: str | None = None) -> dict | None:
        sql = """
            SELECT beekeeperID, name, farm_name, address, latitude, longitude,
                   apiary_type, verification_status, created_at,
                   farm_photo, profile_photo
            FROM beekeepers
            WHERE beekeeperID = %s AND deleted_at IS NULL
            LIMIT 1
        """
        row = Database.execute(sql, (beekeeper_id,), fetchone=True)
        if not row:
            return None

        rating = RatingModel.aggregate_for_beekeeper(beekeeper_id)
        hive_counts = HiveModel.count_by_beekeeper(beekeeper_id)
        rescued = RescueOfferModel.count_resolved_for_beekeeper(beekeeper_id)
        follower_count = FollowModel.count_for_beekeeper(beekeeper_id)
        # NEW — lets BeefarmView.tsx render "Follow" vs "Following"
        # without a second round-trip. Only meaningful for a logged-in
        # citizen viewer; false for guests/other roles.
        is_following = (
            FollowModel.is_following(viewer_citizen_id, beekeeper_id)
            if viewer_citizen_id else False
        )

        return {
            "beekeeperID": row["beekeeperID"],
            "name": row["name"],
            "farmName": row.get("farm_name") or row["name"],
            "location": row.get("address") or "",
            "latitude": float(row["latitude"]) if row.get("latitude") is not None else None,
            "longitude": float(row["longitude"]) if row.get("longitude") is not None else None,
            "apiary_type": row.get("apiary_type"),
            "verification_status": row.get("verification_status"),
            "image": photo_url(row.get("farm_photo")),
            "profile_photo": photo_url(row.get("profile_photo")),
            "rescued": rescued,
            "hives": hive_counts.get("total", 0),
            "rating_avg": rating["average"],
            "rating_count": rating["count"],
            "follower_count": follower_count,
            "is_following": is_following,
        }