// services/beekeeperReport.ts
//
// The BEEKEEPER side of citizen bee reports: the Report tab list, the
// BeeReport modal, and making / resolving rescue offers. Backend:
// routes/rescue_offer.py (GET /reports, GET /reports/<id>, POST "",
// PATCH /<offer_id>/resolve).

import { api } from "./api";
import type { ReportProps } from "@/components/ui/ReportCard";

// The report's status from THIS beekeeper's point of view
// (services/rescue_offer_service.py -> _beekeeper_status).
export type BeekeeperReportStatus = Extract<
	ReportProps["status"],
	"pending" | "in-progress" | "resolved" | "rejected"
>;

export interface BeekeeperReport {
	reportID: string;
	citizenID: string;
	citizen_name: string | null;
	image_url: string | null;
	ai_species_identified: string;
	latitude: number;
	longitude: number;
	bee_danger: "Yes" | "No";
	description: string | null;
	status: "Pending" | "In Progress" | "Resolved" | "False Alarm" | "Cancelled";
	sighted_at: string | null;
	reported_at: string;
	resolved_at: string | null;
	distance_km: number | null;
	my_offer_id: string | null;
	my_offered_fee: number | null;
	my_offer_status: "Pending" | "Accepted" | "Rejected" | "Resolved" | null;
	my_rating: number | null; // the citizen's rating of my rescue
	beekeeper_status: BeekeeperReportStatus;
	// Offering again after the citizen declines (max 3 per report).
	my_offer_count: number; // offers I've sent on this report
	offers_left: number;
	can_offer: boolean; // report open, no offer of mine waiting, under the limit
}

// Fired after the modal changes something (offer sent / resolved) so
// the Report tab list refreshes right away.
export const BEEKEEPER_REPORTS_CHANGED_EVENT = "beeguard:beekeeper-reports-changed";

export const beekeeperReportService = {
	list: () => api.get<BeekeeperReport[]>("/rescue-offers/reports"),

	getOne: (reportId: string) =>
		api.get<BeekeeperReport>(`/rescue-offers/reports/${encodeURIComponent(reportId)}`),

	// validators/rescue_offer_validator.py: report_id "RPT-XXXXXX",
	// offered_fee > 0.
	makeOffer: (reportId: string, offeredFee: number) =>
		api.post("/rescue-offers", { report_id: reportId, offered_fee: offeredFee }),

	resolve: (offerId: string) =>
		api.patch(`/rescue-offers/${encodeURIComponent(offerId)}/resolve`, {}),
};