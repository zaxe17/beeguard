import { api, ApiEnvelope } from "./api";
import { QueenRecommendationResult, InspectionObservation, HealthStatus } from "./hive";

export interface YieldRecord {
	yield_id: string;
	hive_id: string;
	yield_date: string;
	yield_kg: number;
	is_baseline: boolean;
	created_at?: string;
}

export interface AddHarvestPayload {
	yield_kg: number;
	yield_date?: string | null; // defaults to today server-side
	// The Add Yield form's own physical-sign check — required now,
	// same options as the standalone Monitor Hive Health modal.
	// "Normal / Healthy" must be the ONLY item if chosen.
	observations: InspectionObservation[];
}

export interface SetBaselinePayload {
	yield_kg: number;
	yield_year: number;
}

// Numbers behind the health_status decision for this harvest — see
// services/harvest_health.py on the backend for the full rule set.
export interface HarvestHealthDetails {
	year: number;
	cumulative_kg: number;
	baseline_kg: number | null;
	pct: number | null;
	is_minor: boolean;
	recovering_weak: boolean;
}

export interface HarvestResult {
	yield_id: string;
	hive_id: string;
	yield_date: string;
	yield_kg: number;
	is_baseline: boolean;
	observations?: InspectionObservation[];
	health_status?: HealthStatus;
	health_details?: HarvestHealthDetails;
	recommendation: QueenRecommendationResult;
}

export type ApiEnvelopeWithFields<T> = ApiEnvelope<T> & {
	field_errors?: Record<string, string>;
};

export const yieldService = {
	addHarvest: (hiveId: string, payload: AddHarvestPayload) =>
		api.post<HarvestResult>(
			`/hives/${hiveId}/yields`,
			payload,
		) as Promise<ApiEnvelopeWithFields<HarvestResult>>,

	listHistory: (hiveId: string) =>
		api.get<YieldRecord[]>(`/hives/${hiveId}/yields`),

	setBaseline: (hiveId: string, payload: SetBaselinePayload) =>
		api.post<HarvestResult>(
			`/hives/${hiveId}/yields/baseline`,
			payload,
		) as Promise<ApiEnvelopeWithFields<HarvestResult>>,
};