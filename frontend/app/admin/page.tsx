"use client";

import { TotalStatusCard } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { UserNav } from "@/components/UserNav";
import { Icon } from "@iconify/react";
import {
	BeefarmOperation,
	BeeFarmProps,
} from "@/components/ui/BeefarmContainer";
import { PesticideAlert } from "@/components/ui/Alert";

import * as Icons from "@/public/assets/icons/icons";

import {
	analyticsService,
	DashboardSummary,
	HiveHealthSlice,
	YieldTrend,
} from "@/services/analytics";
import { pesticideService, AlertRecord } from "@/services/pesticide";

import beefarmsData from "@/data/beefarms.json";
import { ReportCard } from "@/components/ui/ReportCard";
import { ReportOverview, YieldSummaryChart } from "@/components/graph/Line";
const beefarms = beefarmsData as BeeFarmProps[];

interface GraphProps {
	children?: React.ReactNode;
	title?: string;
	onClick?: () => void;
}

const DEFAULT_HEALTH_COLORS: Record<string, string> = {
	Healthy: "#00cc00",
	"Needs Attention": "#f89d36",
	Weak: "#ffdb4f",
	Diseased: "#ff0000",
};

function formatKg(v: number | undefined | null) {
	return `${(v ?? 0).toFixed(1)}kg`;
}

function toAlertLocation(a: AlertRecord): string {
	if (a.affected_area) return a.affected_area;
	const lat = Number(a.latitude);
	const lng = Number(a.longitude);
	if (Number.isNaN(lat) || Number.isNaN(lng)) return "Unknown location";
	return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

const Beekeeper = () => {
	// ---- DUMMY DATA (replace with analyticsService / pesticideService calls) ----
	const hiveHealthChartData = [
		{
			label: "Healthy",
			value: 18,
			color: DEFAULT_HEALTH_COLORS["Healthy"],
		},
		{
			label: "Needs Attention",
			value: 5,
			color: DEFAULT_HEALTH_COLORS["Needs Attention"],
		},
		{ label: "Weak", value: 3, color: DEFAULT_HEALTH_COLORS["Weak"] },
		{
			label: "Diseased",
			value: 1,
			color: DEFAULT_HEALTH_COLORS["Diseased"],
		},
	];

	const recentAlerts: AlertRecord[] = [
		{
			alert_id: "1",
			affected_area: "North Field",
			latitude: 14.6091,
			longitude: 121.0223,
			scheduled_date: new Date().toISOString(),
			risk_level: "High",
		},
		{
			alert_id: "2",
			affected_area: "",
			latitude: 14.6519,
			longitude: 121.0491,
			scheduled_date: new Date().toISOString(),
			risk_level: "Medium",
		},
	] as AlertRecord[];

	const statusCard = [
		{
			icon: "fa7-solid:people-group",
			count: "1,248",
			title: "Citizen",
			color: "#38b6ff",
		},
		{
			icon: "mdi:beekeeper",
			count: "342",
			title: "Beekeepers",
			color: "#ffdb4f",
		},
		{
			icon: "pinhead:bee",
			count: "1,248",
			title: "Swarm Reports",
			color: "#ff9a00",
		},
		{
			icon: "boxicons:alert-triangle-filled",
			count: "1,248",
			title: "Active Alerts",
			color: "#ff0000",
		},
	];

	const reportStatuses = ["pending", "progress", "resolved"] as const;

	return (
		<div className="w-full h-full p-5 flex items-start flex-col gap-3">
			<UserNav />

			{/* TOP */}
			<div className="w-full flex gap-3">
				<div className="w-full flex flex-col gap-3">
					<h2 className="Poppins-SemiBold text-[#a6a3a3] text-2xl">
						Dashboard
					</h2>

					<div className="w-full flex gap-3">
						{statusCard.map((c, i) => (
							<TotalStatusCard
								key={i}
								icon={c.icon}
								count={c.count}
								title={c.title}
								color={c.color}
							/>
						))}
					</div>
				</div>

				{/* <div className="w-2/3 flex items-stretch gap-3">
					<GraphContainer title="hive health">
						<HiveHealthChart data={hiveHealthChartData} />
					</GraphContainer>

					<GraphContainer title="yield summary">
						<YieldSummaryChart
							value="142.5kg"
							valueLabel="Yield This Month"
							changeAmount={12.3}
							changePercent={9.4}
							categories={["Jan", "Feb", "Mar", "Apr", "May"]}
							data={[80, 95, 110, 125, 142.5]}
						/>
					</GraphContainer>
				</div> */}
			</div>

			<div className="w-full flex-1 flex items-stretch gap-3 min-h-0">
				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
							Reports Overview
						</span>

						<ReportOverview
							categories={["Jan", "Feb", "Mar", "Apr", "May"]}
							data={[80, 95, 110, 125, 142.5]}
						/>
					</div>
				</Container>

				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start px-2">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center">
							Recent Swarm Reports
							<span
								className="text-xs text-[#ffce1c] cursor-pointer"
								onClick={() => console.log("view all alerts")}>
								view all
							</span>
						</span>

						{reportStatuses.map((status) => (
							<ReportCard key={status} status={status} />
						))}
					</div>
				</Container>
			</div>
		</div>
	);
};

export default Beekeeper;
