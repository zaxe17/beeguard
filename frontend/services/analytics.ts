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

// NEW: one shared x-axis (every hive's harvest dates, chronological)
// plus one series per hive, values aligned to that shared axis with
// `null` at indices that belong to a different hive. Powers the
// multi-line History chart.
export interface HiveTrendSeries {
	hive_id: string;
	hive_name: string;
	data: (number | null)[];
}

export interface HiveYieldTrends {
	categories: string[];
	series: HiveTrendSeries[];
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

	// NEW: per-hive multi-line trend for the History page.
	hiveYieldTrends: (months = 12) =>
		api.get<HiveYieldTrends>(`/analytics/hive-yield-trends?months=${months}`),

	hiveHealth: () => api.get<HiveHealthSlice[]>("/analytics/hive-health"),

	// NEW: per-hive this-month totals, used by the Hives list/detail
	// so "Yield (This Month)" no longer shows "—" for every hive.
	hiveMonthlyYield: () =>
		api.get<Record<string, number>>("/analytics/hive-monthly-yield"),

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