// services/harvest.ts

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

// OFFLINE MODE — addHarvest / setBaseline work offline: with no internet
// they're saved on the phone and sent automatically later. In that case
// the result is { success: false, queued: true, message: "No internet —
// saved on this phone..." } (check `res.queued`).
export const yieldService = {
	addHarvest: (hiveId: string, payload: AddHarvestPayload) =>
		api.postOrQueue<HarvestResult>(`/hives/${hiveId}/yields`, payload, {
			label: `Add harvest ${payload.yield_kg} kg — hive ${hiveId}`,
			// dated the day it was harvested, not the day it syncs
			stampDateField: "yield_date",
		}) as Promise<ApiEnvelopeWithFields<HarvestResult>>,

	listHistory: (hiveId: string) =>
		api.get<YieldRecord[]>(`/hives/${hiveId}/yields`),

	setBaseline: (hiveId: string, payload: SetBaselinePayload) =>
		api.postOrQueue<HarvestResult>(`/hives/${hiveId}/yields/baseline`, payload, {
			label: `Set ${payload.yield_year} baseline ${payload.yield_kg} kg — hive ${hiveId}`,
		}) as Promise<ApiEnvelopeWithFields<HarvestResult>>,
};