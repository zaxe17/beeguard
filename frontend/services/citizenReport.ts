// services/citizenReport.ts
//
// Citizen bee-sighting/rescue reports. Not to be confused with any
// beekeeper-side "report" (yield analytics PDF) service — unrelated
// domain, unrelated backend table.
//
// Used by the Report flow (app/citizen/report), the Documents list
// (app/citizen/document/layout.tsx) and the Documents details page
// (app/citizen/document/page.tsx).

import { api } from "./api";
import type { ReportProps } from "@/components/ui/ReportCard";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type BeeDanger = "Yes" | "No";

// reports.status values (chk_reports_status — 'Cancelled' from migration 011).
export type ReportDbStatus =
	| "Pending"
	| "In Progress"
	| "Resolved"
	| "False Alarm"
	| "Cancelled";

export interface CreateReportPayload {
	cvscan_id: string;
	latitude: number;
	longitude: number;
	bee_danger: BeeDanger;
	// Both or neither — backend rejects one without the other.
	sighted_date?: string | null; // YYYY-MM-DD
	sighted_time?: string | null; // HH:MM
	description?: string | null; // max 50 chars — schema-limited
}

export interface CitizenReportRecord {
	reportID: string;
	citizenID: string;
	cvscan_id: string;
	image_url: string | null;
	ai_species_identified: string;
	sighted_at: string | null;
	latitude: number;
	longitude: number;
	bee_danger: BeeDanger;
	description: string | null;
	status: ReportDbStatus;
	reported_at: string;
	resolved_at: string | null;
	cancelled_at?: string | null;
	payment_status: string;
	payment_method: string | null;
}

// Alias used by the Documents pages.
export type ApiReport = CitizenReportRecord;

export const citizenReportService = {
	create: (payload: CreateReportPayload) =>
		api.post<CitizenReportRecord>("/reports", payload),

	listMine: () => api.get<CitizenReportRecord[]>("/reports"),

	getOne: (reportId: string) =>
		api.get<CitizenReportRecord>(`/reports/${reportId}`),

	// Migration 011 — only Pending / In Progress reports can be cancelled.
	cancel: (reportId: string) =>
		api.post<CitizenReportRecord>(`/reports/${reportId}/cancel`, {}),
};

// ── Display helpers (Documents pages) ───────────────

// Fired after the details page changes a report (accept / resolve /
// cancel) so the list on the left refreshes right away.
export const REPORTS_CHANGED_EVENT = "beeguard:reports-changed";

export const toUiStatus = (status: ReportDbStatus): ReportProps["status"] => {
	if (status === "Pending") return "pending";
	if (status === "In Progress") return "in-progress";
	if (status === "False Alarm") return "rejected";
	if (status === "Cancelled") return "cancelled";
	return "resolved";
};

// ADMIN side only: nothing shows as "Rejected" there — a closed report
// is "Cancelled" (red tag). Citizen / beekeeper sides use toUiStatus.
export const toAdminUiStatus = (status: ReportDbStatus): ReportProps["status"] => {
	const ui = toUiStatus(status);
	return ui === "rejected" ? "cancelled" : ui;
};

// Documents tabs (?tab=...) -> which DB statuses they show.
export const matchesTab = (status: ReportDbStatus, tab: string) => {
	if (tab === "pending") return status === "Pending";
	if (tab === "progress") return status === "In Progress";
	if (tab === "resolved") return status === "Resolved";
	return true; // "all"
};

// When the bees were seen, falling back to when it was reported.
export const reportWhen = (r: CitizenReportRecord) => r.sighted_at ?? r.reported_at;

export const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});

export const formatTime = (iso: string) =>
	new Date(iso)
		.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
		.toLowerCase();

// cv_scans.image_url is a path on the Flask server
// ("/uploads/cv-scans/<file>"), so it needs the backend's address.
export const reportImageSrc = (imageUrl: string | null | undefined) => {
	if (!imageUrl) return undefined;
	if (/^https?:\/\//.test(imageUrl)) return imageUrl;
	return `${BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};