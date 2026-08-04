"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiveHealthChart } from "@/components/graph/Doughnut";
import { YieldSummaryChart } from "@/components/graph/Line";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { UserNav } from "@/components/ui/UserNav";
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

// Nearby-farm discovery has no backend endpoint yet — kept as a
// static fixture until that feature exists.
import beefarmsData from "@/data/beefarms.json";
const beefarms = beefarmsData as BeeFarmProps[];

interface GraphProps {
	children?: React.ReactNode;
	title?: string;
}

const GraphContainer = ({ children, title }: GraphProps) => {
	return (
		<div
			className="w-1/2 border border-[#a6a3a3] rounded-2xl p-4 flex flex-col"
			style={{ boxShadow: `rgba(0, 0, 0, 0.24) 0px 3px 8px` }}>
			<h2 className="Poppins-SemiBold capitalize text-center text-xl mb-2">
				{title}
			</h2>
			{children}
		</div>
	);
};

// Fallback palette in case a health slice's color comes back empty —
// mirrors the backend's own palette in analytics_service.py.
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
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<DashboardSummary | null>(null);
	const [hiveHealth, setHiveHealth] = useState<HiveHealthSlice[]>([]);
	const [trend, setTrend] = useState<YieldTrend>({ categories: [], data: [] });
	const [alerts, setAlerts] = useState<AlertRecord[]>([]);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			setErrorMsg(null);

			const [summaryRes, healthRes, trendRes, alertsRes] = await Promise.all([
				analyticsService.dashboardSummary(),
				analyticsService.hiveHealth(),
				analyticsService.yieldTrend(5),
				pesticideService.listMyAlerts(),
			]);

			if (cancelled) return;

			if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
			else setErrorMsg(summaryRes.message);

			if (healthRes.success && healthRes.data) setHiveHealth(healthRes.data);
			if (trendRes.success && trendRes.data) setTrend(trendRes.data);
			if (alertsRes.success && alertsRes.data) setAlerts(alertsRes.data);

			setLoading(false);
		};

		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const statusCard = [
		{
			icon: Icons.hive,
			count: String(summary?.hives.total ?? 0),
			title: "total hives",
			color: "#ffdb4f",
		},
		{
			icon: Icons.health_search,
			count: String(summary?.hives.healthy ?? 0),
			title: "healthy hives",
			color: "#00cc00",
		},
		{
			icon: Icons.alert,
			count: String(summary?.recommendations.open ?? 0),
			title: "open recommendations",
			color: "#ff0000",
		},
		{
			icon: Icons.honey_jar,
			count: formatKg(summary?.yield_totals.this_month.total_kg),
			title: "yield this month",
			color: "#38b6ff",
		},
	];

	const hiveHealthChartData = hiveHealth.length
		? hiveHealth.map((h) => ({
				label: h.label,
				value: h.value,
				color: h.color || DEFAULT_HEALTH_COLORS[h.label] || "#a6a3a3",
			}))
		: [{ label: "No data", value: 1, color: "#e2e2e6" }];

	return (
		<div className="w-full h-full p-5 flex items-start flex-col gap-3">
			{/* USER NAVIGATION BAR */}
			<UserNav />

			<div className="w-full flex gap-3">
				{/* LEFT SIDE */}
				<div className="w-1/3 flex flex-col gap-3">
					<h2 className="Poppins-SemiBold text-[#a6a3a3] text-2xl">
						Dashboard
					</h2>

					<div className="w-full grid grid-cols-2 gap-3 flex-1">
						{statusCard.map((c, i) => (
							<Card
								key={i}
								icon={c.icon}
								count={loading ? "…" : c.count}
								title={c.title}
								color={c.color}
							/>
						))}
					</div>
				</div>

				{/* RIGHT SIDE */}
				<div className="w-2/3 flex items-stretch gap-3">
					<GraphContainer title="hive health">
						<HiveHealthChart data={hiveHealthChartData} />
					</GraphContainer>
					<GraphContainer title="yield summary">
						<YieldSummaryChart
							value={formatKg(summary?.yield_totals.this_month.total_kg)}
							valueLabel="Yield This Month"
							changeAmount={summary?.yield_totals.change_amount ?? 0}
							changePercent={summary?.yield_totals.change_percent ?? 0}
							categories={
								trend.categories.length ? trend.categories : ["No data"]
							}
							data={trend.data.length ? trend.data : [0]}
						/>
					</GraphContainer>
				</div>
			</div>

			{errorMsg && <p className="text-xs text-red-600 px-2">{errorMsg}</p>}

			<div className="w-full flex-1 flex items-stretch gap-3 min-h-0">
				{/* LEFT CONTAINER — nearby farms (fixture, no backend yet) */}
				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
							Operations{" "}
							<span
								className={`text-xs text-[#ffce1c] cursor-pointer ${beefarms.length > 0 ? "block" : "hidden"}`}>
								view all
							</span>
						</span>

						{beefarms && beefarms.length > 0 ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 p-2">
								{beefarms.map((nb, i) => (
									<BeefarmOperation
										key={i}
										image={nb.image}
										farmName={nb.farmName}
										location={nb.location}
										miles={nb.miles}
									/>
								))}
							</div>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
								<Icon
									icon="carbon:task-settings"
									className="w-20 h-20 text-[#a6a3a3]"
								/>
								<h2 className="w-1/2 Poppins-SemiBold text-x text-[#817b70]">
									No Operations
								</h2>
							</div>
						)}
					</div>
				</Container>

				{/* RIGHT CONTAINER — real pesticide alerts for this beekeeper */}
				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
							Recent Alerts{" "}
							<span
								className={`text-xs text-[#ffce1c] cursor-pointer ${alerts.length > 0 ? "block" : "hidden"}`}
								onClick={() => router.push("/beekeeper/alert")}>
								view all
							</span>
						</span>

						{alerts && alerts.length > 0 ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 p-2">
								{alerts.map((a) => (
									<PesticideAlert
										key={a.alert_id}
										location={toAlertLocation(a)}
										date={new Date(a.scheduled_date).toLocaleDateString()}
										time={new Date(a.scheduled_date).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
										status={a.risk_level.toLowerCase() as "high" | "medium" | "low"}
										onClick={() =>
											router.push(`/beekeeper/alert/details?id=${a.alert_id}`)
										}
									/>
								))}
							</div>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
								<Icon
									icon="famicons:notifications-off"
									className="w-20 h-20 text-[#a6a3a3]"
								/>
								<h2 className="w-1/2 Poppins-SemiBold text-x text-[#817b70]">
									No other alerts at the moment
								</h2>
							</div>
						)}
					</div>
				</Container>
			</div>
		</div>
	);
};

export default Beekeeper;