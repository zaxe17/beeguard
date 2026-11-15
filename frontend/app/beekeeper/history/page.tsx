"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { YieldBarChart, YieldSeries } from "@/components/graph/Line";
import { analyticsService, HiveYieldTrends } from "@/services/analytics";
import { queenService, QueenHistoryRow } from "@/services/queen";
import { HIVES_CHANGED_EVENT } from "@/components/modal/HivesModal";
import { formatPeriod, periodYear } from "@/lib/harvestSeason";
import {
	BQHistoryCardSkeleton,
	YearFilterSkeleton,
	YieldChartSkeleton,
} from "@/components/loading/SkeletonLoading";

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function formatDay(raw: string) {
	const m = /(\d{4})-(\d{2})-(\d{2})/.exec(raw);
	if (!m) return formatPeriod(raw);
	return `${MONTH_NAMES[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
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
				className={`absolute inset-0 bg-linear-to-r from-[#ffdb4f] to-[#eec572] transition-opacity duration-150 ease-in-out ${
					active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
				}`}
			/>
			<span className="relative Poppins-SemiBold">{year}</span>
		</button>
	);
};

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
			<div className="flex justify-between items-center">
				<h3 className="Poppins-Bold text-[#4A2F00] text-base capitalize">
					{row.hive_name}
				</h3>
				<span
					className="Poppins-SemiBold text-[10px] py-1 px-2 rounded-md flex items-center gap-1"
					style={{ color: style.text, backgroundColor: style.bg }}>
					<Icon icon={style.icon} className="w-3 h-3" />
					{style.label}
				</span>
			</div>

			<div className="flex justify-between items-center text-xs">
				<span className="text-[#817b70]">Queen installed</span>
				<span className="Poppins-SemiBold text-[#4A2F00]">
					{formatDate(row.queen_installed_date)}
				</span>
			</div>

			<div className="flex justify-between items-center text-xs">
				<span className="text-[#817b70]">Last evaluated</span>
				<span className="Poppins-SemiBold text-[#4A2F00]">
					{formatDate(row.evaluated_at)}
				</span>
			</div>

			<div className="flex justify-between items-center text-xs">
				<span className="text-[#817b70]">Status</span>
				{row.replaced ? (
					<span className="Poppins-SemiBold text-[#00cc00] flex items-center gap-1">
						<Icon
							icon="mdi:check-decagram"
							className="w-3.5 h-3.5"
						/>
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

			<p className="text-[11px] text-[#817b70] leading-snug border-t border-[#f0e6d2] pt-2 mt-1 normal-case">
				{row.reason}
			</p>
		</div>
	);
};

const History = () => {
	const [loading, setLoading] = useState(true);
	const [trends, setTrends] = useState<HiveYieldTrends>({
		categories: [],
		series: [],
	});
	const [queenHistory, setQueenHistory] = useState<QueenHistoryRow[]>([]);
	const [selectedYear, setSelectedYear] = useState<string>("All");

	const load = async () => {
		setLoading(true);
		const [trendsRes, queenRes] = await Promise.all([
			analyticsService.hiveYieldTrends(60),
			queenService.historyForBeekeeper(),
		]);
		if (trendsRes.success && trendsRes.data) setTrends(trendsRes.data);
		if (queenRes.success && queenRes.data) setQueenHistory(queenRes.data);
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, []);

	useEffect(() => {
		const handler = () => load();
		window.addEventListener(HIVES_CHANGED_EVENT, handler);
		return () => window.removeEventListener(HIVES_CHANGED_EVENT, handler);
	}, []);

	const availableYears = useMemo(() => {
		const years = new Set(trends.categories.map(periodYear));
		return Array.from(years)
			.sort((a, b) => b - a)
			.map(String);
	}, [trends.categories]);

	const hiveNameById = useMemo(() => {
		const m = new Map<string, string>();
		queenHistory.forEach((q) => m.set(q.hive_id, q.hive_name));
		return m;
	}, [queenHistory]);

	const { labels, series, details } = useMemo(() => {
		const idxs =
			selectedYear === "All"
				? trends.categories.map((_, i) => i)
				: trends.categories
						.map((c, i) => ({ c, i }))
						.filter(
							({ c }) => String(periodYear(c)) === selectedYear,
						)
						.map(({ i }) => i);

		const months: string[] = [];
		const monthIndex = new Map<string, number>();
		idxs.forEach((i) => {
			const m = formatPeriod(trends.categories[i]);
			if (!monthIndex.has(m)) {
				monthIndex.set(m, months.length);
				months.push(m);
			}
		});

		const series: YieldSeries[] = [];
		const details: string[][][] = [];

		trends.series.forEach((s) => {
			const totals: (number | null)[] = months.map(() => null);
			const days: string[][] = months.map(() => []);

			idxs.forEach((i) => {
				const v = s.data[i];
				if (v === null || v === undefined || v === 0) return;
				const m = monthIndex.get(formatPeriod(trends.categories[i]))!;
				totals[m] = (totals[m] ?? 0) + v;
				days[m].push(formatDay(trends.categories[i]));
			});

			if (totals.some((v) => v !== null)) {
				series.push({
					hive_id: s.hive_id,
					label: hiveNameById.get(s.hive_id) ?? s.hive_name,
					data: totals,
				});
				details.push(days);
			}
		});

		return { labels: months, series, details };
	}, [trends, selectedYear, hiveNameById]);

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
			<div className="flex flex-col h-full w-full min-h-0 overflow-y-auto lg:scrollbar-auto scrollbar-none">
				<div className="h-2/3 w-full flex flex-col justify-center pt-10 p-5">
					<div className="flex justify-start gap-3 mb-6">
						<YearFilter
							year="All"
							active={selectedYear === "All"}
							onClick={() => setSelectedYear("All")}
						/>
						{loading ? (
							<>
								<YearFilterSkeleton />
								<YearFilterSkeleton />
							</>
						) : (
							availableYears.map((y) => (
								<YearFilter
									key={y}
									year={y}
									active={selectedYear === y}
									onClick={() => setSelectedYear(y)}
								/>
							))
						)}
					</div>

					<div className="w-full flex-1 min-h-80 relative">
						{loading ? (
							<YieldChartSkeleton showSummary={false} />
						) : (
							<>
								<YieldBarChart
									categories={displayLabels}
									series={displaySeries}
									details={
										series.length ? details : undefined
									}
								/>
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

				<div className="w-full px-5 py-4">
					<h2 className="Poppins-Bold text-xl text-[#4A2F00] mb-3 capitalize">
						Queen Replacement History
					</h2>

					{loading ? (
						<div className="w-full grid lg:grid-cols-3 grid-cols-1 gap-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<BQHistoryCardSkeleton key={i} />
							))}
						</div>
					) : queenHistory.length === 0 ? (
						<div className="w-full flex flex-col items-center justify-center py-10 opacity-60">
							<Icon
								icon="fluent:crown-24-filled"
								className="w-16 h-16 text-[#a6a3a3]"
							/>
							<p className="text-sm text-[#817b70] mt-2">
								No hives yet — add a hive to start tracking
								queen replacements.
							</p>
						</div>
					) : (
						<div className="w-full grid lg:grid-cols-3 grid-cols-1 gap-3">
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
