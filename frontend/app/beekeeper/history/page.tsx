"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { YieldSummaryChart, YieldSeries } from "@/components/graph/Line";
import {
	analyticsService,
	DashboardSummary,
	HiveYieldTrends,
} from "@/services/analytics";
import { queenService, QueenHistoryRow } from "@/services/queen";
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

// ── BEE QUEEN REPLACEMENT HISTORY CARD ──────────────────────
//
// One card per hive owned by this beekeeper. Renders the latest
// queen-replacement evaluation for the hive:
//   - queen_installed_date: when the beekeeper last confirmed a
//     queen was installed (this is the "replaced on" date).
//   - level + reason: the current recommendation state (Normal /
//     Monitor / Replace) from the latest evaluation.
//   - replaced: true when the latest Monitor/Replace recommendation
//     was actually acted on (queen_installed_date is on/after the
//     recommendation's evaluated_at). Drawn as a green badge; an
//     unresolved Monitor/Replace stays red/amber.
//
// This block replaces the earlier "asasd" placeholder that had no
// data source wired up.
type BQHistoryCardProps = {
	row: QueenHistoryRow;
};

const LEVEL_STYLE: Record<
	QueenHistoryRow["level"],
	{ label: string; bg: string; text: string; icon: string }
> = {
	Normal: {
		label: "Normal",
		bg: "#00cc0033",
		text: "#00cc00",
		icon: "mdi:check-circle",
	},
	Monitor: {
		label: "Monitor",
		bg: "#ffdb4f33",
		text: "#b58900",
		icon: "mdi:eye-outline",
	},
	Replace: {
		label: "Replace",
		bg: "#ff000033",
		text: "#ff0000",
		icon: "mdi:alert-circle",
	},
};

function formatDate(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

const BQHistoryCard = ({ row }: BQHistoryCardProps) => {
	const style = LEVEL_STYLE[row.level] ?? LEVEL_STYLE.Normal;

	return (
		<div
			className="bg-white p-4 rounded-lg flex flex-col gap-2"
			style={{
				boxShadow:
					"rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px",
			}}>
			{/* HEADER — hive name + current level badge */}
			<div className="flex justify-between items-center">
				<h3 className="Poppins-Bold text-[#4A2F00] text-base capitalize">
					{row.hive_name || row.hive_id}
				</h3>
				<span
					className="Poppins-SemiBold text-[10px] py-1 px-2 rounded-md flex items-center gap-1"
					style={{ color: style.text, backgroundColor: style.bg }}>
					<Icon icon={style.icon} className="w-3 h-3" />
					{style.label}
				</span>
			</div>

			{/* QUEEN INSTALLED / REPLACED-ON DATE */}
			<div className="flex justify-between items-center text-xs">
				<span className="text-[#817b70]">Queen installed</span>
				<span className="Poppins-SemiBold text-[#4A2F00]">
					{formatDate(row.queen_installed_date)}
				</span>
			</div>

			{/* LAST EVALUATED */}
			<div className="flex justify-between items-center text-xs">
				<span className="text-[#817b70]">Last evaluated</span>
				<span className="Poppins-SemiBold text-[#4A2F00]">
					{formatDate(row.evaluated_at)}
				</span>
			</div>

			{/* REPLACED-STATUS ROW — only meaningful when the most
			    recent Monitor/Replace was actually addressed. */}
			<div className="flex justify-between items-center text-xs">
				<span className="text-[#817b70]">Status</span>
				{row.replaced ? (
					<span className="Poppins-SemiBold text-[#00cc00] flex items-center gap-1">
						<Icon icon="mdi:check-decagram" className="w-3.5 h-3.5" />
						Replaced
					</span>
				) : row.level === "Normal" ? (
					<span className="Poppins-SemiBold text-[#00cc00]">
						No action needed
					</span>
				) : (
					<span className="Poppins-SemiBold text-[#ff9a00]">
						Pending action
					</span>
				)}
			</div>

			{/* REASON — quick explanation of the current level */}
			<p className="text-[11px] text-[#817b70] leading-snug border-t border-[#f0e6d2] pt-2 mt-1 normal-case">
				{row.reason}
			</p>
		</div>
	);
};

const History = () => {
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<DashboardSummary | null>(null);
	const [trends, setTrends] = useState<HiveYieldTrends>({
		categories: [],
		series: [],
	});
	const [queenHistory, setQueenHistory] = useState<QueenHistoryRow[]>([]);
	const [selectedYear, setSelectedYear] = useState<string>("All");

	const load = async () => {
		setLoading(true);
		const [summaryRes, trendsRes, queenRes] = await Promise.all([
			analyticsService.dashboardSummary(),
			// Wide lookback so multiple harvest seasons across years show up.
			analyticsService.hiveYieldTrends(60),
			queenService.historyForBeekeeper(),
		]);
		if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
		if (trendsRes.success && trendsRes.data) setTrends(trendsRes.data);
		if (queenRes.success && queenRes.data) setQueenHistory(queenRes.data);
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

	// The chart itself should always render even when there is no
	// harvest data yet — otherwise the whole line-graph panel is just
	// a "No harvest history yet" line of text with no visual context.
	// We fall back to an empty x-axis label + a single-series line at
	// y=0 so the axes, grid and legend are all still visible.
	const chartHasRealData = series.some((s) => s.data.some((v) => v !== null));
	const displayLabels = labels.length ? labels : ["No data"];
	const displaySeries: YieldSeries[] =
		series.length > 0
			? series
			: [
					{
						hive_id: "placeholder",
						label: "No harvests yet",
						data: [0],
						color: "#e2e2e6",
					},
				];

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

					<div className="w-full h-screen relative">
						{loading ? (
							<p className="text-center text-sm text-[#817b70] p-4">
								Loading history...
							</p>
						) : (
							<>
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
									categories={displayLabels}
									series={displaySeries}
								/>
								{/* Empty-state overlay — the chart's axes still
								    show, but we hint that there's nothing to
								    trend yet. */}
								{!chartHasRealData && (
									<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
										<div className="bg-white/70 backdrop-blur-sm px-4 py-2 rounded-md text-sm text-[#817b70] Poppins-SemiBold">
											No harvest history yet — chart will
											populate as you log harvests.
										</div>
									</div>
								)}
							</>
						)}
					</div>
				</div>

				{/* BEE QUEEN REPLACEMENT HISTORY — one card per hive */}
				<div className="w-full px-5 py-4">
					<h2 className="Poppins-Bold text-xl text-[#4A2F00] mb-3 capitalize">
						Queen Replacement History
					</h2>

					{loading ? (
						<p className="text-sm text-[#817b70]">
							Loading queen history...
						</p>
					) : queenHistory.length === 0 ? (
						<div className="w-full flex flex-col items-center justify-center py-10 opacity-60">
							<Icon
								icon="fluent:crown-24-filled"
								className="w-16 h-16 text-[#a6a3a3]"
							/>
							<p className="text-sm text-[#817b70] mt-2">
								No hives yet — add a hive to start tracking queen
								replacements.
							</p>
						</div>
					) : (
						<div className="w-full grid grid-cols-3 gap-3">
							{queenHistory.map((row) => (
								<BQHistoryCard key={row.hive_id} row={row} />
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default History;