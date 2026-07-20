"use client";

import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
);

type YieldSummaryChartProps = {
	value: string;
	valueLabel: string;
	changeAmount: number;
	changePercent: number;
	categories: string[];
	data: number[];
	lineColor?: string;
};

export const YieldSummaryChart = ({
	value,
	valueLabel,
	changeAmount,
	changePercent,
	categories,
	data,
	lineColor = "#FFC93F",
}: YieldSummaryChartProps) => {
	const isNegative = changeAmount < 0;

	const chartData = {
		labels: categories,
		datasets: [
			{
				data,
				borderColor: lineColor,
				backgroundColor: lineColor,
				pointBackgroundColor: lineColor,
				pointBorderColor: "#fff",
				pointBorderWidth: 2,
				pointRadius: 5,
				pointHoverRadius: 7,
				borderWidth: 3,
				tension: 0.4,
				fill: false,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				enabled: true,
			},
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
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: "#f0f0f0",
				},
				ticks: {
					font: { size: 11 },
					color: "#666",
				},
			},
			x: {
				grid: {
					display: false,
				},
				ticks: {
					font: { size: 12, weight: "bold" as const },
					color: "#333",
				},
			},
		},
	};

	return (
		<div className="w-full h-full flex flex-col items-stretch gap-4">
			{/* STATS */}
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

			{/* CHART */}
			<div className="flex-1 flex flex-col">
				<div className="flex-1 relative">
					<Line data={chartData} options={options} />
				</div>
			</div>
		</div>
	);
};
