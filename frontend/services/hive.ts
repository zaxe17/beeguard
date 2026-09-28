// services/hive.ts

import { api, ApiEnvelope } from "./api";

export type HealthStatus = "Healthy" | "Needs Attention" | "Weak" | "Diseased";
export type HiveState = "Active" | "Inactive";

export interface QueenRecommendationResult {
	hive_id: string;
	beekeeper_id: string;
	level: "Normal" | "Monitor" | "Replace";
	reason_code: string;
	reason: string;
	yield_baseline_kg: number | null;
	yield_current_kg: number | null;
	yield_pct: number | null;
	queen_age_days: number | null;
	recommendation_id?: string;
}

export interface Hive {
	hive_id: string;
	beekeeper_id: string;
	hive_name: string;
	bee_species: string;
	date_established: string;
	queen_installed_date: string | null;
	historical_yield_kg: number | null;
	historical_yield_year: number | null;
	health_status: HealthStatus;
	hive_state: HiveState;
	created_at?: string;
	updated_at?: string | null;
	// NEW — only in GET /hives (list). Days since the queen was installed.
	queen_age_days?: number | null;
	// NEW — only in GET /hives (list). The open queen recommendation, or
	// null. Set even for a Healthy hive (e.g. queen older than the limit).
	queen_recommendation?: QueenRecommendationSummary | null;
}

export interface QueenRecommendationSummary {
	level: "Monitor" | "Replace";
	reason: string;
	reason_code: string; // e.g. "QUEEN_AGE_EXCEEDED"
}

export interface CreateHivePayload {
	hive_name: string;
	bee_species: string;
	date_established: string; // YYYY-MM-DD
	queen_installed_date?: string | null;
	health_status?: HealthStatus;
	hive_state?: HiveState;
	historical_yield_kg?: number | null;
	historical_yield_year?: number | null;
}

export type InspectionObservation =
	| "Normal / Healthy"
	| "Presence of Queen Cells"
	| "Reduction of Open Brood"
	| "Emaciated Queen";

export interface PhysicalInspectionPayload {
	// NEW: multi-select — one or more checkboxes, instead of a single
	// radio choice. "Normal / Healthy" must be the ONLY item if chosen.
	observations: InspectionObservation[];
	activity_date?: string | null;
}

export interface InspectionResult {
	hive_id: string;
	observations: string[];
	health_status: HealthStatus;
	recommendation: QueenRecommendationResult;
}

export interface MaintenanceRecord {
	maintenance_id: string;
	hive_id: string;
	activity_type: "Feeding" | "Mite Treatment" | "Inspection";
	remarks: string | null;
	activity_date: string;
	created_at?: string;
}

export type ApiEnvelopeWithFields<T> = ApiEnvelope<T> & {
	field_errors?: Record<string, string>;
};

// OFFLINE MODE — create / updateState / recordInspection work offline:
// with no internet they're saved on the phone and sent automatically
// later. In that case the result is { success: false, queued: true,
// message: "No internet — saved on this phone..." } (check `res.queued`).
// Everything read with api.get also shows the last saved copy offline.
export const hiveService = {
	create: (payload: CreateHivePayload) =>
		api.postOrQueue<Hive>("/hives", payload, {
			label: `Add hive "${payload.hive_name}"`,
		}) as Promise<ApiEnvelopeWithFields<Hive>>,

	list: (state?: HiveState) =>
		api.get<Hive[]>(`/hives${state ? `?state=${state}` : ""}`),

	getOne: (hiveId: string) => api.get<Hive>(`/hives/${hiveId}`),

	updateState: (hiveId: string, hiveState: HiveState) =>
		api.patchOrQueue<Hive>(
			`/hives/${hiveId}/state`,
			{ hive_state: hiveState },
			{ label: `Set hive ${hiveId} to ${hiveState}` },
		),

	recordInspection: (hiveId: string, payload: PhysicalInspectionPayload) =>
		api.postOrQueue<InspectionResult>(`/hives/${hiveId}/inspection`, payload, {
			label: `Health check — hive ${hiveId}`,
			// dated the day it was done, not the day it syncs
			stampDateField: "activity_date",
		}) as Promise<ApiEnvelopeWithFields<InspectionResult>>,

	listMaintenance: (hiveId: string, limit?: number) =>
		api.get<MaintenanceRecord[]>(
			`/hives/${hiveId}/maintenance${limit ? `?limit=${limit}` : ""}`,
		),
};