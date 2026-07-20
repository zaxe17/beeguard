"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

type ChartDataItem = {
	label: string;
	value: number;
	color: string;
};

type HiveHealthChartProps = {
	data: ChartDataItem[];
};

export const HiveHealthChart = ({ data }: HiveHealthChartProps) => {
	const total = data.reduce((sum, d) => sum + d.value, 0);

	const chartData = {
		labels: data.map((d) => d.label),
		datasets: [
			{
				data: data.map((d) => d.value),
				backgroundColor: data.map((d) => d.color),
				borderWidth: 0,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		cutout: "60%",
		animation: {
			duration: 1200,
			easing: "easeOutQuart" as const,
			delay: (context: any) => {
				if (context.type !== "data") return 0;
				return context.dataIndex * 150;
			},
		},
		animateRotate: true,
		animateScale: true,
		layout: {
			padding: {
				top: 40,
				bottom: 40,
				left: 70,
				right: 70,
			},
		},
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				enabled: false,
			},
			datalabels: {
				color: "#000",
				anchor: "end" as const,
				align: "end" as const,
				offset: 8,
				font: {
					size: 11,
				},
				formatter: (value: number, context: any) => {
					const label = context.chart.data.labels[context.dataIndex];
					const percentage = ((value / total) * 100).toFixed(1);
					return `${label}\n${percentage}%`;
				},
			},
		},
	};

	return (
		<div className="w-full h-full flex items-center justify-center overflow-visible">
			<Doughnut data={chartData} options={options} />
		</div>
	);
};
