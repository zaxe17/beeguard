"use client";

import { useIsPage } from "@/hooks/useIsPage";
import { useEffect, useState } from "react";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	Tooltip,
	Legend,
	ChartData,
	ChartOptions,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	Tooltip,
	Legend,
);

const DEFAULT_PALETTE = [
	"#FFC93F",
	"#38b6ff",
	"#ff6b6b",
	"#00cc88",
	"#a66bff",
	"#ff9f40",
];

export type YieldSeries = {
	hive_id?: string;
	label: string;
	data: (number | null)[];
	color?: string;
};

function buildLineOptions(integerTicks = false): ChartOptions<"line"> {
	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: "top" as const,
				labels: { boxWidth: 12, font: { size: 11 } },
			},
			tooltip: { enabled: true },
		},
		animations: {
			x: {
				type: "number" as const,
				easing: "easeOutQuart" as const,
				duration: 1200,
				from: NaN,
				delay(context: any) {
					if (context.type !== "data") return 0;
					return context.dataIndex * 100;
				},
			},
			y: {
				type: "number" as const,
				easing: "easeOutQuart" as const,
				duration: 1200,
				from(context: any) {
					return context.chart.scales.y.getPixelForValue(0);
				},
				delay(context: any) {
					if (context.type !== "data") return 0;
					return context.dataIndex * 100;
				},
			},
		} as any,
		scales: {
			y: {
				beginAtZero: true,
				grid: { color: "#f0f0f0" },
				ticks: {
					font: { size: 11 },
					color: "#666",
					...(integerTicks ? { precision: 0 } : {}),
				},
			},
			x: {
				grid: { display: false },
				ticks: {
					font: { size: 11, weight: "bold" as const },
					color: "#333",
				},
			},
		},
	};
}

function buildYieldDataset(
	color: string,
	label: string,
	data: (number | null)[],
	hideZero = false,
) {
	return {
		label,
		data: hideZero ? data.map((v) => (v === 0 ? null : v)) : data,
		spanGaps: true,
		borderColor: color,
		backgroundColor: color,
		pointBackgroundColor: color,
		pointBorderColor: "#fff",
		pointBorderWidth: 2,
		pointRadius: 5,
		pointHoverRadius: 7,
		borderWidth: 3,
		tension: 0.4,
		fill: false,
	};
}

function LineChartBase({
	chartData,
	integerTicks = false,
}: {
	chartData: ChartData<"line">;
	integerTicks?: boolean;
}) {
	return (
		<div className="flex-1 flex flex-col">
			<div className="flex-1 relative">
				<Line
					data={chartData}
					options={buildLineOptions(integerTicks)}
				/>
			</div>
		</div>
	);
}

type YieldSummaryChartProps = {
	value: string;
	valueLabel: string;
	changeAmount: number;
	changePercent: number | null;
	changeLabel?: string;
	categories: string[];
	data?: number[];
	series?: YieldSeries[];
	lineColor?: string;
	onClick?: () => void;
	hideSummary?: boolean;
};

export const YieldSummaryChart = ({
	value,
	valueLabel,
	changeAmount,
	changePercent,
	changeLabel = "vs last season",
	categories,
	data,
	series,
	lineColor = "#FFC93F",
	onClick,
	hideSummary,
}: YieldSummaryChartProps) => {
	const isNegative = changeAmount < 0;
	const isZero = changeAmount === 0;
	const isMultiLine = !!series && series.length > 0;

	const datasets = isMultiLine
		? series!.map((s, i) =>
				buildYieldDataset(
					s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
					s.label,
					s.data,
					true,
				),
			)
		: [buildYieldDataset(lineColor, "Total Yield (kg)", data ?? [], true)];

	const chartData: ChartData<"line"> = {
		labels: categories.map((c) => c.split("\n")) as unknown as string[],
		datasets,
	};

	const location = useIsPage("/beekeeper/history");

	return (
		<div
			className={`w-full h-full flex flex-col items-stretch gap-4 ${
				onClick ? "cursor-pointer" : ""
			}`}
			onClick={onClick}>
			{!location && !hideSummary && (
				<div className="flex items-center justify-between text-sm">
					<div className="flex flex-col">
						<span className="Poppins-SemiBold text-[#38b6ff]">
							{value}
						</span>
						<span className="text-[#817b70]">{valueLabel}</span>
					</div>

					<div className="flex flex-col">
						<span
							className={`Poppins-SemiBold ${
								isZero
									? "text-[#817b70]"
									: isNegative
										? "text-[#ff0000]"
										: "text-[#00cc00]"
							}`}>
							{isZero ? (
								"No change"
							) : (
								<>
									{isNegative ? "" : "+"}
									{changeAmount} kg
									{changePercent !== null &&
										` (${isNegative ? "↓" : "↑"}${Math.abs(changePercent)}%)`}
								</>
							)}
						</span>
						<span className="text-[#817b70]">{changeLabel}</span>
					</div>
				</div>
			)}

			<LineChartBase chartData={chartData} />
		</div>
	);
};

type YieldBarChartProps = {
	categories: string[];
	series: YieldSeries[];
	details?: string[][][];
};

export const YieldBarChart = ({
	categories,
	series,
	details,
}: YieldBarChartProps) => {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	const entries: { m: number; s: number }[] = [];
	const spacers: number[] = [];
	const midLabels = new Map<number, string>();

	categories.forEach((label, m) => {
		const bars = series
			.map((s, si) => ({ si, v: s.data[m] }))
			.filter((b) => b.v !== null && b.v !== undefined);
		if (!bars.length) return;

		if (entries.length) {
			spacers.push(entries.length);
			entries.push({ m: -1, s: -1 });
		}

		const start = entries.length;
		bars.forEach((b) => entries.push({ m, s: b.si }));
		midLabels.set(Math.floor((start + entries.length - 1) / 2), label);
	});

	const dividers = {
		id: "monthDividers",
		beforeDatasetsDraw(chart: any) {
			const { ctx, chartArea, scales } = chart;
			ctx.save();
			ctx.strokeStyle = "#d9c9a0";
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 4]);
			spacers.forEach((i) => {
				const px = scales.x.getPixelForValue(i);
				ctx.beginPath();
				ctx.moveTo(px, chartArea.top);
				ctx.lineTo(px, chartArea.bottom);
				ctx.stroke();
			});
			ctx.restore();
		},
	};

	const chartData = {
		labels: entries.map((_, i) => String(i)),
		datasets: series.map((s, si) => ({
			label: s.label,
			data: entries.map((e) => (e.s === si ? s.data[e.m] : null)),
			backgroundColor:
				s.color ?? DEFAULT_PALETTE[si % DEFAULT_PALETTE.length],
			borderWidth: 0,
			borderRadius: 0,
			barPercentage: 1,
			categoryPercentage: 1,
			inflateAmount: -3.5,
		})),
	} as unknown as ChartData<"bar">;

	const rotation = isMobile ? 45 : 0;

	const options: ChartOptions<"bar"> = {
		responsive: true,
		maintainAspectRatio: false,
		layout: { padding: { bottom: 0 } },
		plugins: {
			legend: {
				display: true,
				position: "top",
				labels: { boxWidth: 12, font: { size: 11 } },
			},
			tooltip: {
				enabled: true,
				filter: (item) => entries[item.dataIndex]?.m !== -1,
				callbacks: {
					title: (items) =>
						categories[entries[items[0].dataIndex]?.m] ?? "",
					label: (ctx) =>
						`${ctx.dataset.label}: ${Math.round((ctx.parsed.y ?? 0) * 10) / 10} kg`,
					afterLabel: (ctx) =>
						details?.[ctx.datasetIndex]?.[
							entries[ctx.dataIndex].m
						] ?? [],
				},
			},
			datalabels: {
				anchor: "end",
				align: "start",
				offset: 4,
				clamp: true,
				color: "#4A2F00",
				font: { size: 10, weight: "bold" },
				formatter: (v: number | null) =>
					v === null ? "" : Math.round(v * 10) / 10,
			},
		},
		scales: {
			y: {
				stacked: true,
				beginAtZero: true,
				grid: { color: "#f0f0f0" },
				ticks: { font: { size: 11 }, color: "#666" },
			},
			x: {
				stacked: true,
				grid: { display: false },
				ticks: {
					font: { size: 11, weight: "bold" as const },
					color: "#333",
					minRotation: rotation,
					maxRotation: rotation,
					autoSkip: false,
					callback: (_v: any, index: number) =>
						midLabels.get(index) ?? "",
				},
			},
		},
	};

	return (
		<div className="w-full h-full flex flex-col">
			<div className="flex-1 relative w-full">
				<Bar
					key={isMobile ? "mobile" : "desktop"}
					data={chartData}
					options={options}
					plugins={[dividers]}
				/>
			</div>
		</div>
	);
};

export const REPORT_STATUS_COLORS: Record<string, string> = {
	pending: "#ffdb4f",
	"in-progress": "#ff9a00",
	resolved: "#1f6f5f",
	rejected: "#ff0000",
	cancelled: "#ff0000",
};

export type ReportOverviewSeries = {
	key: string;
	label: string;
	data: number[];
	color?: string;
};

type ReportOverviewProps = {
	categories: string[];
	data?: number[];
	series?: ReportOverviewSeries[];
	lineColor?: string;
	label?: string;
};

export const ReportOverview = ({
	categories,
	data = [],
	series,
	lineColor = "#FFC93F",
	label = "Swarm Reports",
}: ReportOverviewProps) => {
	const datasets =
		series && series.length > 0
			? series.map((s, i) =>
					buildYieldDataset(
						s.color ??
							REPORT_STATUS_COLORS[s.key] ??
							DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
						s.label,
						s.data,
					),
				)
			: [buildYieldDataset(lineColor, label, data)];

	const chartData: ChartData<"line"> = {
		labels: categories.map((c) => c.split("\n")) as unknown as string[],
		datasets,
	};

	return <LineChartBase chartData={chartData} integerTicks />;
};
