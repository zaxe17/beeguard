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
	observation: InspectionObservation;
	activity_date?: string | null;
}

export interface InspectionResult {
	hive_id: string;
	observation: string;
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

export const hiveService = {
	create: (payload: CreateHivePayload) =>
		api.post<Hive>("/hives", payload) as Promise<ApiEnvelopeWithFields<Hive>>,

	list: (state?: HiveState) =>
		api.get<Hive[]>(`/hives${state ? `?state=${state}` : ""}`),

	getOne: (hiveId: string) => api.get<Hive>(`/hives/${hiveId}`),

	updateState: (hiveId: string, hiveState: HiveState) =>
		api.patch<Hive>(`/hives/${hiveId}/state`, { hive_state: hiveState }),

	recordInspection: (hiveId: string, payload: PhysicalInspectionPayload) =>
		api.post<InspectionResult>(
			`/hives/${hiveId}/inspection`,
			payload,
		) as Promise<ApiEnvelopeWithFields<InspectionResult>>,

	listMaintenance: (hiveId: string, limit?: number) =>
		api.get<MaintenanceRecord[]>(
			`/hives/${hiveId}/maintenance${limit ? `?limit=${limit}` : ""}`,
		),
};