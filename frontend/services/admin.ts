// services/admin.ts
//
// Admin-only API (routes/admin.py). Every call needs an admin login.

import { api } from "./api";
import type { VerificationInfo } from "./verification";
import type { ReportDbStatus } from "./citizenReport";

export interface AdminReport {
	reportID: string;
	status: ReportDbStatus;
	image_url: string | null;
	ai_species_identified: string;
	latitude: number;
	longitude: number;
	bee_danger?: "Yes" | "No";
	description?: string | null;
	sighted_at: string | null;
	reported_at: string;
	resolved_at?: string | null;
	citizen_name: string | null;
}

// Month-over-month change shown under each dashboard card.
// percent is null when last month was 0 (the card shows "+N new" instead).
export interface AdminStatChange {
	this_month: number;
	last_month: number;
	percent: number | null;
	direction: "up" | "down" | "same";
}

export interface AdminOverviewSeries {
	key: "pending" | "in-progress" | "resolved" | "cancelled";
	label: string;
	data: number[];
}

// GET /admin/reports/<id> — the report details popup.
export interface AdminReportOffer {
	offer_id: string;
	offered_fee: number; // 0 = free rescue
	offer_status: "Pending" | "Accepted" | "Rejected" | "Resolved";
	created_at: string;
	resolved_at: string | null;
	beekeeperID: string;
	beekeeper_name: string;
	farm_name: string | null;
	beekeeper_contact: string | null;
	rating_value: number | null; // citizen's rating after the rescue
	rating_comment: string | null;
}

export interface AdminReportDetail {
	report: AdminReport & {
		cancelled_at: string | null;
		payment_status: string | null;
		payment_method: string | null;
		citizenID: string;
		citizen_email: string | null;
		citizen_contact: string | null;
	};
	offers: AdminReportOffer[];
}

export interface AdminDashboard {
	counts: {
		citizens: number;
		beekeepers: number;
		reports: number;
		active_alerts: number;
		pending_verifications: number;
		pending_alerts: number; // beekeeper alerts waiting for approval
	};
	changes: {
		citizens: AdminStatChange;
		beekeepers: AdminStatChange;
		reports: AdminStatChange;
		active_alerts: AdminStatChange;
	};
	reports_overview: {
		categories: string[]; // month labels, e.g. "May".."Sep"
		// One line per status: pending, in-progress, resolved, rejected.
		series: AdminOverviewSeries[];
		data: number[]; // all statuses added together
	};
	recent_reports: AdminReport[];
}

export type AdminUserRole = "citizen" | "beekeeper";

export interface AdminUserRow {
	id: string;
	role: AdminUserRole;
	name: string;
	username: string | null;
	email: string;
	contact_no: string | null;
	address: string | null;
	status: string; // "Active" | "Inactive"
	verification_status: string | null; // beekeepers only
	farm_name: string | null;
	created_at: string;
	profile_photo?: string | null; // "/uploads/profile/..." or null
}

export interface AdminUsersResponse {
	users: AdminUserRow[];
	counts: {
		all: number;
		citizens: number;
		beekeepers: number;
		pending_verifications: number;
	};
}

export interface AdminHive {
	hive_id: string;
	hive_name: string;
	bee_species: string;
	health_status: string;
	hive_state: string;
	date_established: string | null;
	last_check: string | null;
	yield_this_month: number;
}

// Citizen activity = their reports; beekeeper activity = their offers.
export interface AdminActivity {
	reportID: string;
	status: ReportDbStatus;
	image_url: string | null;
	latitude: number;
	longitude: number;
	sighted_at: string | null;
	reported_at: string;
	offer_id?: string;
	offered_fee?: number;
	offer_status?: "Pending" | "Accepted" | "Rejected" | "Resolved";
	citizen_name?: string;
}

export interface AdminUserDetail {
	user: {
		id: string;
		role: AdminUserRole;
		name: string;
		username: string | null;
		email: string;
		contact_no: string | null;
		address: string | null;
		status: string;
		created_at: string;
		// beekeepers only
		farm_name?: string | null;
		apiary_type?: string | null;
		verification_status?: string | null;
		verification_document_type?: string | null;
		verification_submitted_at?: string | null;
		verification_reviewed_at?: string | null;
		verification_rejection_reason?: string | null;
		has_verification_document?: boolean;
	};
	hives: AdminHive[];
	activity: AdminActivity[];
}

export const adminService = {
	dashboard: () => api.get<AdminDashboard>("/admin/dashboard"),

	users: (opts?: { role?: string; search?: string }) => {
		const qs = new URLSearchParams();
		if (opts?.role && opts.role !== "all") qs.set("role", opts.role);
		if (opts?.search) qs.set("search", opts.search);
		const q = qs.toString();
		return api.get<AdminUsersResponse>(`/admin/users${q ? `?${q}` : ""}`);
	},

	user: (role: string, id: string) =>
		api.get<AdminUserDetail>(`/admin/users/${role}/${encodeURIComponent(id)}`),

	setStatus: (role: string, id: string, status: "Active" | "Inactive") =>
		api.patch(`/admin/users/${role}/${encodeURIComponent(id)}/status`, { status }),

	verifications: (status = "Pending") =>
		api.get<VerificationInfo[]>(`/admin/verifications?status=${encodeURIComponent(status)}`),

	approve: (beekeeperId: string) =>
		api.post<VerificationInfo>(
			`/admin/verifications/${encodeURIComponent(beekeeperId)}/approve`,
			{},
		),

	reject: (beekeeperId: string, reason: string) =>
		api.post<VerificationInfo>(
			`/admin/verifications/${encodeURIComponent(beekeeperId)}/reject`,
			{ reason },
		),

	report: (reportId: string) =>
		api.get<AdminReportDetail>(`/admin/reports/${encodeURIComponent(reportId)}`),

	reports: (status?: string) =>
		api.get<AdminReport[]>(
			`/admin/reports${status && status !== "all" ? `?status=${encodeURIComponent(status)}` : ""}`,
		),
};