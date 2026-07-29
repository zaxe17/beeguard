import { api, ApiEnvelope } from "./api";

export interface HiveCounts {
	total: number;
	active: number;
	inactive: number;
	healthy: number;
	needs_attention: number;
	weak: number;
	diseased: number;
}

export interface YieldAggregate {
	harvests: number;
	total_kg: number;
	avg_kg: number;
	max_kg: number;
	min_kg: number;
}

export interface DashboardSummary {
	hives: HiveCounts;
	yield_totals: {
		all_time: YieldAggregate;
		this_month: YieldAggregate;
		prev_month: YieldAggregate;
		change_amount: number;
		change_percent: number;
	};
	recommendations: {
		open: number;
		replace: number;
		monitor: number;
	};
}

export interface YieldTrend {
	categories: string[];
	data: number[];
}

export interface HiveHealthSlice {
	label: string;
	value: number;
	color: string;
}

export interface SeasonalComparisonRow {
	year: number;
	month: number;
	total_kg: number;
	harvests: number;
}

export const analyticsService = {
	dashboardSummary: () => api.get<DashboardSummary>("/analytics/dashboard"),

	yieldTrend: (months = 12) =>
		api.get<YieldTrend>(`/analytics/yield-trend?months=${months}`),

	hiveHealth: () => api.get<HiveHealthSlice[]>("/analytics/hive-health"),

	seasonalComparison: (hiveId?: string) =>
		api.get<SeasonalComparisonRow[]>(
			`/analytics/seasonal-comparison${hiveId ? `?hive_id=${hiveId}` : ""}`,
		),

	reportDataset: (params?: {
		date_from?: string;
		date_to?: string;
		hive_id?: string;
	}) => {
		const qs = new URLSearchParams();
		if (params?.date_from) qs.set("date_from", params.date_from);
		if (params?.date_to) qs.set("date_to", params.date_to);
		if (params?.hive_id) qs.set("hive_id", params.hive_id);
		const query = qs.toString();
		return api.get<Record<string, unknown>>(
			`/analytics/report${query ? `?${query}` : ""}`,
		) as Promise<ApiEnvelope<Record<string, unknown>>>;
	},
};