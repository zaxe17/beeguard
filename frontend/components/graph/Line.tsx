"use client";

import { useIsPage } from "@/hooks/useIsPage";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	ChartData,
	ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
);

// Distinct, colorblind-friendlier palette cycled by hive index when
// a per-hive color isn't explicitly provided.
const DEFAULT_PALETTE = [
	"#FFC93F", // yellow (original single-line default)
	"#38b6ff", // blue
	"#ff6b6b", // red
	"#00cc88", // green
	"#a66bff", // purple
	"#ff9f40", // orange
];

export type YieldSeries = {
	hive_id?: string;
	label: string; // hive_name — used in the legend
	data: (number | null)[];
	color?: string;
};

// ---- Shared chart.js config, used by both YieldSummaryChart and ReportOverview ----

function buildLineOptions(): ChartOptions<"line"> {
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
				delay: (context: any) => {
					if (context.type !== "data" || context.xStarted) return 0;
					context.xStarted = true;
					return context.dataIndex * 100;
				},
			},
			y: {
				type: "number" as const,
				easing: "easeOutQuart" as const,
				duration: 1200,
				from: (context: any) =>
					context.chart.scales.y.getPixelForValue(0),
				delay: (context: any) => {
					if (context.type !== "data" || context.yStarted) return 0;
					context.yStarted = true;
					return context.dataIndex * 100;
				},
			},
		} as any,
		scales: {
			y: {
				beginAtZero: true,
				grid: { color: "#f0f0f0" },
				ticks: { font: { size: 11 }, color: "#666" },
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
) {
	return {
		label,
		data,
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

// Small internal component so the <Line> render + wrapper markup
// isn't duplicated between YieldSummaryChart and ReportOverview.
function LineChartBase({ chartData }: { chartData: ChartData<"line"> }) {
	return (
		<div className="flex-1 flex flex-col">
			<div className="flex-1 relative">
				<Line data={chartData} options={buildLineOptions()} />
			</div>
		</div>
	);
}

// ---- YieldSummaryChart ----

type YieldSummaryChartProps = {
	value: string;
	valueLabel: string;
	changeAmount: number;
	changePercent: number;
	categories: string[]; // supports multi-line "Harvest Season N\nMon YYYY"
	data?: number[]; // single-line mode (Dashboard)
	series?: YieldSeries[]; // multi-line mode (History, per hive)
	lineColor?: string;
	onClick?: () => void; // e.g. navigate Dashboard -> History
	hideSummary?: boolean; // force-hide the value/change header row
};

export const YieldSummaryChart = ({
	value,
	valueLabel,
	changeAmount,
	changePercent,
	categories,
	data,
	series,
	lineColor = "#FFC93F",
	onClick,
	hideSummary,
}: YieldSummaryChartProps) => {
	const isNegative = changeAmount < 0;
	const isMultiLine = !!series && series.length > 0;

	const datasets = isMultiLine
		? series!.map((s, i) =>
				buildYieldDataset(
					s.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
					s.label,
					s.data,
				),
			)
		: [buildYieldDataset(lineColor, "Total Yield (kg)", data ?? [])];

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
								isNegative ? "text-[#ff0000]" : "text-[#00cc00]"
							}`}>
							{isNegative ? "" : "+"}
							{changeAmount} kg ({isNegative ? "↓" : "↑"}
							{Math.abs(changePercent)}%)
						</span>
						<span className="text-[#817b70]">vs last season</span>
					</div>
				</div>
			)}

			<LineChartBase chartData={chartData} />
		</div>
	);
};

// ---- ReportOverview ----
// Previously referenced `chartData`/`options` that only existed inside
// YieldSummaryChart's scope — that would throw at runtime. Give it its
// own props/data so it's a real standalone component.

type ReportOverviewProps = {
	categories: string[];
	data: number[];
	lineColor?: string;
};

export const ReportOverview = ({
	categories,
	data,
	lineColor = "#FFC93F",
}: ReportOverviewProps) => {
	const chartData: ChartData<"line"> = {
		labels: categories.map((c) => c.split("\n")) as unknown as string[],
		datasets: [buildYieldDataset(lineColor, "Total Yield (kg)", data)],
	};

	return <LineChartBase chartData={chartData} />;
};
