# services/citizen_report_service.py
#
# Citizen bee-sighting/rescue report submission — pulls the species
# and image straight from a previously-created cv_scans row rather
# than re-uploading, so the photo the citizen took at Step 1 (Camera)
# is the same one attached to the final report at Step 3 (Review).
#
# Not to be confused with services/report_service.py (the BEEKEEPER
# yield-analytics PDF generator) — unrelated domain, unrelated table.
import datetime as dt

from config.database import Database
from models.report import ReportModel
from models.cv_scan import CVScanModel
from services.notification_service import (
    NotificationService,
    TYPE_ADMIN_NEW_REPORT,
    species_label,
)

try:
    from geopy.distance import geodesic
except ImportError:  # pragma: no cover — geopy is in requirements.txt
    geodesic = None

# Same radius the beekeeper Report tab uses to decide what's "nearby"
# (services/rescue_offer_service.py).
NEARBY_REPORT_RADIUS_KM = 50


def _notify_nearby_beekeepers(report_id: str, latitude: float, longitude: float,
                              species: str | None) -> int:
    """
    "Report has been sent to nearby beekeepers" — one notification per
    verified, active beekeeper whose farm pin is within
    NEARBY_REPORT_RADIUS_KM of the sighting. Best-effort: never raises.
    """
    if geodesic is None:
        return 0
    try:
        beekeepers = Database.execute(
            """
            SELECT beekeeperID, latitude, longitude
            FROM beekeepers
            WHERE deleted_at IS NULL
              AND status = 'Active'
              AND verification_status = 'Verified'
              AND latitude IS NOT NULL AND longitude IS NOT NULL
            """,
            (),
            fetchall=True,
        ) or []

        items = []
        for bk in beekeepers:
            km = geodesic(
                (float(latitude), float(longitude)),
                (float(bk["latitude"]), float(bk["longitude"])),
            ).km
            if km <= NEARBY_REPORT_RADIUS_KM:
                items.append(NotificationService.new_report_item(
                    beekeeper_id=bk["beekeeperID"],
                    report_id=report_id,
                    species=species,
                    distance_km=round(km, 1),
                ))
        return NotificationService.notify_many(items)
    except Exception as e:
        print(f"[CITIZEN-REPORT] Couldn't notify nearby beekeepers: {e}")
        return 0


class CitizenReportService:

    @staticmethod
    def create_report(citizen_id: str, payload: dict) -> dict:
        """
        payload (already validated by validators.report_validator):
          cvscan_id, latitude, longitude, bee_danger,
          sighted_at (nullable datetime), description (nullable)
        """
        scan = CVScanModel.find_by_id(payload["cvscan_id"])
        if not scan:
            raise ValueError("Scan not found — please scan a photo again.")
        # A scan can be a guest scan (citizenID NULL) or belong to
        # another citizen entirely if the cvscan_id was tampered with
        # client-side — only allow attaching it to a report if it's
        # either unclaimed or already this citizen's own.
        if scan.get("citizenID") not in (None, citizen_id):
            raise PermissionError("This scan does not belong to you.")

        conn = Database.get_connection()
        try:
            report_id = ReportModel.insert_with_conn(conn, {
                "citizen_id":            citizen_id,
                "cvscan_id":             payload["cvscan_id"],
                "image_url":             scan["image_url"],
                # reports.ai_species_identified is NOT NULL, but a scan
                # can come back with no detection (identified_species
                # is nullable there) — fall back to a clear placeholder
                # rather than blocking report submission entirely.
                "ai_species_identified": scan.get("identified_species") or "Unidentified",
                "sighted_at":            payload.get("sighted_at"),
                "latitude":              payload["latitude"],
                "longitude":             payload["longitude"],
                "bee_danger":            payload["bee_danger"],
                "description":           payload.get("description"),
            })
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        # After the report is safely saved — see _notify_nearby_beekeepers.
        _notify_nearby_beekeepers(
            report_id,
            payload["latitude"],
            payload["longitude"],
            scan.get("identified_species"),
        )

        # Admins: every new swarm report (bell + push). Best-effort.
        danger = " It may be dangerous." if payload.get("bee_danger") == "Yes" else ""
        NotificationService.notify_admins(
            title="New Swarm Report",
            message=(
                f"A citizen reported {species_label(scan.get('identified_species'))}."
                f"{danger} Tap to view report {report_id}."
            ),
            notification_type=TYPE_ADMIN_NEW_REPORT,
            report_id=report_id,
        )

        return ReportModel.find_by_id(report_id)

    @staticmethod
    def list_history(citizen_id: str) -> list[dict]:
        rows = ReportModel.list_by_citizen(citizen_id)
        return [_normalize(r) for r in rows]

    @staticmethod
    def get_detail(citizen_id: str, report_id: str) -> dict | None:
        row = ReportModel.find_by_id_and_citizen(report_id, citizen_id)
        return _normalize(row) if row else None

    @staticmethod
    def cancel_report(citizen_id: str, report_id: str) -> dict:
        report = ReportModel.find_by_id_and_citizen(report_id, citizen_id)
        if not report:
            raise LookupError("Report not found.")
        if report.get("status") not in ("Pending", "In Progress"):
            raise ValueError(f"This report is already {report.get('status')} and can't be cancelled.")

        # Beekeepers whose offer is about to be rejected by the cancel.
        offerers = Database.execute(
            """
            SELECT DISTINCT beekeeperID FROM rescue_offers
            WHERE report_id = %s AND offer_status IN ('Pending', 'Accepted')
            """,
            (report_id,),
            fetchall=True,
        ) or []

        conn = Database.get_connection()
        try:
            updated = ReportModel.cancel_with_conn(conn, report_id)
            if not updated:
                raise ValueError("This report changed before it could be cancelled.")
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        NotificationService.notify_many([
            NotificationService.offer_update_item(
                beekeeper_id=o["beekeeperID"],
                report_id=report_id,
                title="Report Cancelled",
                message=f"The citizen cancelled report {report_id}. "
                        f"Your offer is no longer needed.",
            )
            for o in offerers
        ])

        return _normalize(ReportModel.find_by_id_and_citizen(report_id, citizen_id))


def _normalize(row: dict) -> dict:
    for field in ("sighted_at", "reported_at", "resolved_at", "cancelled_at"):
        v = row.get(field)
        if isinstance(v, (dt.date, dt.datetime)):
            row[field] = v.isoformat()
    for field in ("latitude", "longitude"):
        if row.get(field) is not None:
            row[field] = float(row[field])
    return row