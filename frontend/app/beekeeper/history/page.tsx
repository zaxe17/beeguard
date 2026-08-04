"use client";

import { useEffect, useMemo, useState } from "react";
import { YieldSummaryChart, YieldSeries } from "@/components/graph/Line";
import {
	analyticsService,
	DashboardSummary,
	HiveYieldTrends,
} from "@/services/analytics";
import { HIVES_CHANGED_EVENT } from "@/components/modal/HivesModal";
import { formatPeriod, periodYear } from "@/lib/harvestSeason";

function formatKg(v: number | undefined | null) {
	return `${(v ?? 0).toFixed(1)}kg`;
}

const YearFilter = ({
	year,
	active,
	onClick,
}: {
	year: string;
	active: boolean;
	onClick: () => void;
}) => {
	return (
		<button
			onClick={onClick}
			className={`relative border border-[#a6a3a3] border-solid py-1 px-3 rounded-full overflow-hidden group ${
				active ? "text-white" : "text-[#4A2F00]"
			}`}>
			<span
				className={`absolute inset-0 bg-linear-to-r from-[#ffdb4f] to-[#eec572] transition-opacity duration-200 ease-in-out ${
					active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
				}`}
			/>
			<span className="relative Poppins-SemiBold">{year}</span>
		</button>
	);
};

// BEE QUEEN HISTORY CARD
const BQHistoryCard = () => {
	return (
		<div className="bg-white p-3 rounded-lg" style={{boxShadow: "rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px"}}>
			asasd
		</div>
	)
}

const History = () => {
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<DashboardSummary | null>(null);
	const [trends, setTrends] = useState<HiveYieldTrends>({
		categories: [],
		series: [],
	});
	const [selectedYear, setSelectedYear] = useState<string>("All");

	const load = async () => {
		setLoading(true);
		const [summaryRes, trendsRes] = await Promise.all([
			analyticsService.dashboardSummary(),
			// Wide lookback so multiple harvest seasons across years show up.
			analyticsService.hiveYieldTrends(60),
		]);
		if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
		if (trendsRes.success && trendsRes.data) setTrends(trendsRes.data);
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, []);

	// Instant refresh whenever a harvest/hive/queen action happens
	// anywhere in the app.
	useEffect(() => {
		const handler = () => load();
		window.addEventListener(HIVES_CHANGED_EVENT, handler);
		return () => window.removeEventListener(HIVES_CHANGED_EVENT, handler);
	}, []);

	// Years present in the data — filter buttons are generated from
	// real harvest history instead of being hardcoded.
	const availableYears = useMemo(() => {
		const years = new Set(trends.categories.map(periodYear));
		return Array.from(years)
			.sort((a, b) => b - a)
			.map(String);
	}, [trends.categories]);

	// Filtering by year keeps every series aligned to the same
	// filtered index positions, since categories + all series' data
	// arrays share the same length/order from the backend.
	const { labels, series } = useMemo(() => {
		const idxs =
			selectedYear === "All"
				? trends.categories.map((_, i) => i)
				: trends.categories
						.map((c, i) => ({ c, i }))
						.filter(
							({ c }) => String(periodYear(c)) === selectedYear,
						)
						.map(({ i }) => i);

		const labels = idxs.map((i) => formatPeriod(trends.categories[i]));
		const series: YieldSeries[] = trends.series.map((s) => ({
			hive_id: s.hive_id,
			label: s.hive_name,
			data: idxs.map((i) => s.data[i]),
		}));

		return { labels, series };
	}, [trends, selectedYear]);

	return (
		<div className="h-full w-full min-h-0 flex justify-center items-center overflow-hidden">
			<div className="flex flex-col h-full w-full min-h-0 overflow-y-auto">
				{/* LINE GRAPH */}
				<div className="h-2/3 w-full flex flex-col justify-center pt-10 p-5">
					{/* FILTER BUTTON */}
					<div className="flex justify-start gap-3 mb-6">
						<YearFilter
							year="All"
							active={selectedYear === "All"}
							onClick={() => setSelectedYear("All")}
						/>
						{availableYears.map((y) => (
							<YearFilter
								key={y}
								year={y}
								active={selectedYear === y}
								onClick={() => setSelectedYear(y)}
							/>
						))}
					</div>

					<div className="w-full h-screen">
						{loading ? (
							<p className="text-center text-sm text-[#817b70] p-4">
								Loading history...
							</p>
						) : series.length === 0 ? (
							<p className="text-center text-sm text-[#817b70] p-4">
								No harvest history yet.
							</p>
						) : (
							<YieldSummaryChart
								value={formatKg(
									summary?.yield_totals.this_month.total_kg,
								)}
								valueLabel="Yield This Month"
								changeAmount={
									summary?.yield_totals.change_amount ?? 0
								}
								changePercent={
									summary?.yield_totals.change_percent ?? 0
								}
								categories={
									labels.length ? labels : ["No data"]
								}
								series={series}
							/>
						)}
					</div>
				</div>

				{/* BEE QUEEN REPLACEMENT CONTAINER HISTORY */}
				<div className="w-full px-5 py-4 grid grid-cols-3 gap-3">
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
					<BQHistoryCard />
				</div>
			</div>
		</div>
	);
};

export default History;
