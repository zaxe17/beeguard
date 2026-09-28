import { api, ApiEnvelope } from "./api";

export type PesticideType = "Insecticide" | "Herbicide" | "Fungicide";
export type RiskLevel = "Low" | "Medium" | "High";
export type AlertSource = "admin" | "beekeeper";
// Beekeeper-reported alerts wait for an admin (Migration 014).
// Admin-created alerts are "Approved" right away.
export type AlertApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface CreateAlertPayload {
	title: string;
	pesticide_type?: PesticideType | null;
	latitude: number;
	longitude: number;
	scheduled_date: string; // ISO datetime, e.g. "2026-08-01T08:00:00"
	expiration_date?: string | null;
	risk_level?: RiskLevel;
	danger_radius_km?: number | null;
	affected_area?: string | null;
}

export interface AlertRecipient {
	recipient_id: string;
	beekeeper_id: string;
	distance_km: number | null;
	risk_level?: RiskLevel;
}

export interface CreateAlertResult {
	alert_id: string;
	// "Pending" when a beekeeper submitted it (nobody notified yet).
	approval_status: AlertApprovalStatus;
	danger_radius_km: number;
	// Number of beekeepers actually inside the danger radius.
	matched_count: number;
	// Total beekeepers we notified (matched + unlocated + courtesy
	// heads-ups to those outside the radius). This is what the
	// confirmation toast should show — the old `matched_count` alone
	// misleadingly said "0 nearby beekeepers" when everyone on the
	// platform still got a heads-up notification.
	notified_count: number;
	recipients: AlertRecipient[];
}

export interface AlertRecord {
	alert_id: string;
	adminID: string;
	beekeeperID: string | null;
	title: string;
	pesticide_type: PesticideType | null;
	affected_area: string | null;
	latitude: number;
	longitude: number;
	scheduled_date: string;
	expiration_date: string | null;
	danger_radius_km: number;
	risk_level: RiskLevel;
	// present only on /alerts/mine (joined from alert_recipients)
	distance_km?: number;
	notified_at?: string;
	source?: AlertSource;
	reported_by_beekeeper_id?: string | null;
	approval_status?: AlertApprovalStatus;
	rejection_reason?: string | null;
	created_at?: string;
}

// GET /pesticide/alerts/review — admin Alerts page.
export interface AdminAlertRecord extends AlertRecord {
	description: string | null;
	application_method: string | null;
	source: AlertSource;
	approval_status: AlertApprovalStatus;
	reviewed_at: string | null;
	created_at: string;
	admin_name: string | null;
	reporter_name: string | null;
	reporter_contact: string | null;
	reporter_farm: string | null;
}

// GET /pesticide/alerts/<alert_id> — full detail for the Alert Details
// page. Shape matches schemas/alert_schema.py::AlertDetailOut on the
// backend (risk_level is already lowercased there to match the
// "high" | "medium" | "low" status prop the UI components expect).
export interface AlertDetail {
	alert_id: string;
	title: string;
	source: AlertSource;
	status: "high" | "medium" | "low";
	location: string;
	latitude: number;
	longitude: number;
	pesticide_type: PesticideType | null;
	application_method: string | null;
	description: string | null;
	danger_radius_km: number;
	scheduled_date: string; // ISO
	expiration_date: string | null; // ISO
	created_at: string; // ISO
	issued_by: string | null;
	contact: string | null;

	// Only set when the viewer is a matched beekeeper recipient — null
	// for admins and for self-authored alerts with no recipient match.
	your_distance_km: number | null;

	// Pending / Rejected are only visible to admins and the reporter.
	approval_status?: AlertApprovalStatus;
	rejection_reason?: string | null;
}

export type ApiEnvelopeWithFields<T> = ApiEnvelope<T> & {
	field_errors?: Record<string, string>;
};

export const pesticideService = {
	createAlert: (payload: CreateAlertPayload) =>
		api.post<CreateAlertResult>(
			"/pesticide/alerts",
			payload,
		) as Promise<ApiEnvelopeWithFields<CreateAlertResult>>,

	// Admin — alerts this admin created
	listAdminAlerts: () => api.get<AlertRecord[]>("/pesticide/alerts"),

	// Any authenticated role — all currently active (non-expired) alerts.
	// includePast = true also returns alerts that already ended (All tab).
	listActiveAlerts: (includePast = false) =>
		api.get<AlertRecord[]>(
			`/pesticide/alerts/active${includePast ? "?include_past=1" : ""}`,
		),

	// Beekeeper — alerts they were actually matched/notified for
	listMyAlerts: () => api.get<AlertRecord[]>("/pesticide/alerts/mine"),

	// Any authenticated role — full detail for one alert, used by the
	// Alert Details page (?id=<alert_id>). Every beekeeper can open
	// any alert now (used to be recipient-only), so notifications
	// forwarded to non-recipients still land on a real detail page.
	getAlertDetail: (alertId: string) =>
		api.get<AlertDetail>(`/pesticide/alerts/${alertId}`),

	// Admin — who was matched for a given alert
	listAlertRecipients: (alertId: string) =>
		api.get<AlertRecipient[]>(`/pesticide/alerts/${alertId}/recipients`),

	// Admin — every alert for review ("Pending" | "Approved" | "Rejected" | "all")
	listForReview: (status: AlertApprovalStatus | "all" = "all") =>
		api.get<AdminAlertRecord[]>(
			`/pesticide/alerts/review?status=${encodeURIComponent(status)}`,
		),

	// Admin — approve a beekeeper's alert (it's sent out to beekeepers)
	approveAlert: (alertId: string) =>
		api.post<CreateAlertResult>(
			`/pesticide/alerts/${encodeURIComponent(alertId)}/approve`,
			{},
		),

	// Admin — reject a beekeeper's alert (reporter is told the reason)
	rejectAlert: (alertId: string, reason: string) =>
		api.post<{ alert_id: string; approval_status: AlertApprovalStatus; rejection_reason: string }>(
			`/pesticide/alerts/${encodeURIComponent(alertId)}/reject`,
			{ reason },
		),
};