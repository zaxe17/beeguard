import { api } from "./api";
import { QueenRecommendationResult } from "./hive";

export interface QueenRecommendationRecord extends QueenRecommendationResult {
	recommendation_id: string;
	evaluated_at: string;
	acknowledged_at: string | null;
	resolved_at: string | null;
}

export const queenService = {
	evaluate: (hiveId: string) =>
		api.get<QueenRecommendationResult>(`/queen/evaluate/${hiveId}`),

	confirmReplacement: (hiveId: string, installedOn?: string | null) =>
		api.post<QueenRecommendationResult>(
			`/queen/confirm-replacement/${hiveId}`,
			installedOn ? { installed_on: installedOn } : {},
		),

	listOpenRecommendations: () =>
		api.get<QueenRecommendationRecord[]>("/queen/recommendations"),

	resolve: (recommendationId: string) =>
		api.post<Record<string, never>>(
			`/queen/recommendations/${recommendationId}/resolve`,
			{},
		),

	acknowledge: (recommendationId: string) =>
		api.post<Record<string, never>>(
			`/queen/recommendations/${recommendationId}/acknowledge`,
			{},
		),
};