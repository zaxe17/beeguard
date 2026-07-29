import { api, ApiEnvelope } from "./api";
import { QueenRecommendationResult } from "./hive";

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
}

export interface SetBaselinePayload {
	yield_kg: number;
	yield_year: number;
}

export interface HarvestResult {
	yield_id: string;
	hive_id: string;
	yield_date: string;
	yield_kg: number;
	is_baseline: boolean;
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