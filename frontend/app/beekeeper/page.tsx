// app/beekeeper/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiveHealthChart } from "@/components/graph/Doughnut";
import { YieldSummaryChart } from "@/components/graph/Line";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { useAuth } from "@/context/AuthContext";
import { UserNav } from "@/components/UserNav";
import { Icon } from "@iconify/react";
import { BeefarmOperation } from "@/components/ui/BeefarmContainer";
import { PesticideAlert } from "@/components/ui/Alert";

import * as Icons from "@/public/assets/icons/icons";

import {
	analyticsService,
	DashboardSummary,
	HiveHealthSlice,
	YieldTrend,
} from "@/services/analytics";
import { pesticideService, AlertRecord } from "@/services/pesticide";
import { useAlertLocations, getAlertLocation } from "@/hooks/useAlertLocation";
import { ALERTS_CHANGED_EVENT } from "@/components/modal/AlertModal";
import { HIVES_CHANGED_EVENT } from "@/components/modal/HivesModal";
import { useModal } from "@/context/ModalContext";
import { usePlaceName } from "@/hooks/usePlaceName";
import {
	BEEKEEPER_REPORTS_CHANGED_EVENT,
	beekeeperReportService,
	type BeekeeperReport,
} from "@/services/beekeeperReport";
import { reportImageSrc } from "@/services/citizenReport";
import {
	OperationSkeleton,
	PesticideAlertSkeleton,
} from "@/components/loading/SkeletonLoading";

type ModalType = "BeeReport";

// Operations refreshes on its own so new citizen reports show up.
const OPERATIONS_POLL_MS = 30000;

// Order in the Operations panel: my accepted jobs, then my offers
// waiting for the citizen, then new reports nobody has taken yet.
const operationRank = (r: BeekeeperReport) => {
	if (r.beekeeper_status === "in-progress") return 0;
	if (r.my_offer_status === "Pending") return 1;
	return 2;
};
type BeeReportPayload = { reportId: string };

// One rescue job in the Operations panel — looks up the report's
// place name from its coordinates (reports store only lat/lng).
const OperationItem = ({
	report,
	onClick,
}: {
	report: BeekeeperReport;
	onClick: () => void;
}) => {
	const place = usePlaceName(report.latitude, report.longitude);
	return (
		<BeefarmOperation
			image={reportImageSrc(report.image_url)}
			location={place}
			distanceKm={report.distance_km}
			status={
				report.beekeeper_status === "in-progress"
					? "in-progress"
					: report.my_offer_status === "Pending"
						? "offer-sent"
						: report.my_offer_status === "Rejected"
							? "declined"
							: "new"
			}
			// A declined offer isn't the current offer anymore.
			offeredFee={
				report.my_offer_status === "Rejected"
					? null
					: report.my_offered_fee
			}
			onClick={onClick}
		/>
	);
};

interface GraphProps {
	children?: React.ReactNode;
	title?: string;
	// NEW — optional click handler so a graph card can double as a
	// nav shortcut (e.g. "yield summary" -> History tab), without
	// forcing every GraphContainer to be clickable.
	onClick?: () => void;
}

const GraphContainer = ({ children, title, onClick }: GraphProps) => {
	return (
		<div
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onClick={onClick}
			onKeyDown={(e) => {
				if (onClick && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					onClick();
				}
			}}
			className={`lg:w-1/2 w-full border border-[#a6a3a3] rounded-2xl p-4 flex flex-col ${
				onClick
					? "cursor-pointer hover:border-[#ffce1c] hover:bg-[#fff1ad]/30 transition-colors"
					: ""
			}`}
			style={{ boxShadow: `rgba(0, 0, 0, 0.24) 0px 3px 8px` }}>
			<h2 className="Poppins-SemiBold capitalize text-center text-xl mb-2">
				{title}
			</h2>
			{children}
		</div>
	);
};

const DEFAULT_HEALTH_COLORS: Record<string, string> = {
	Healthy: "#00cc00",
	"Needs Attention": "#f89d36",
	Weak: "#ffdb4f",
	Diseased: "#ff0000",
};

function formatKg(v: number | undefined | null) {
	return `${(v ?? 0).toFixed(1)}kg`;
}

const Beekeeper = () => {
	const router = useRouter();
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<DashboardSummary | null>(null);
	const [hiveHealth, setHiveHealth] = useState<HiveHealthSlice[]>([]);
	const [trend, setTrend] = useState<YieldTrend>({
		categories: [],
		data: [],
	});
	const [alerts, setAlerts] = useState<AlertRecord[]>([]);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	// NEW — this beekeeper's active rescue jobs (Operations panel).
	const [operations, setOperations] = useState<BeekeeperReport[]>([]);
	const [operationsError, setOperationsError] = useState<string | null>(null);
	const { openModal } = useModal<ModalType, BeeReportPayload>();
	const [operationsLoading, setOperationsLoading] = useState(true);

	const isVerified =
		user?.role === "beekeeper" && user.verification_status === "Verified";

	// Everything the beekeeper can act on right now:
	//   • In Progress — my offer was accepted
	//   • Offer Sent  — my offer is waiting for the citizen
	//   • New Report  — a nearby report still waiting for a rescuer
	//                   (I haven't offered, or my offer wasn't picked yet)
	// Resolved / rejected / cancelled ones stay in the Report tab only.
	const loadOperations = useCallback(async () => {
		if (!isVerified) {
			setOperations([]);
			setOperationsError(null);
			setOperationsLoading(false);
			return;
		}
		const res = await beekeeperReportService.list();
		if (!res.success || !res.data) {
			setOperationsError(res.message || "Couldn't load reports.");
			setOperationsLoading(false);
			return;
		}
		setOperationsError(null);
		// Declined offers stay while I can still send a new one.
		const active = res.data.filter(
			(r) =>
				r.beekeeper_status === "in-progress" ||
				(r.status === "Pending" &&
					(r.my_offer_status !== "Rejected" || r.can_offer)),
		);
		active.sort((a, b) => {
			const byRank = operationRank(a) - operationRank(b);
			if (byRank !== 0) return byRank;
			// Newest report first within the same group.
			return (
				new Date(b.reported_at).getTime() -
				new Date(a.reported_at).getTime()
			);
		});
		setOperations(active);
		setOperationsLoading(false);
	}, [isVerified]);

	useEffect(() => {
		loadOperations();
		const interval = isVerified
			? setInterval(loadOperations, OPERATIONS_POLL_MS)
			: null;
		window.addEventListener(
			BEEKEEPER_REPORTS_CHANGED_EVENT,
			loadOperations,
		);
		return () => {
			if (interval) clearInterval(interval);
			window.removeEventListener(
				BEEKEEPER_REPORTS_CHANGED_EVENT,
				loadOperations,
			);
		};
	}, [loadOperations, isVerified]);

	// Exact-location cache for alerts that have no affected_area.
	const resolvedLocations = useAlertLocations(alerts);

	const load = useCallback(async () => {
		setLoading(true);
		setErrorMsg(null);

		const [summaryRes, healthRes, trendRes, alertsRes] = await Promise.all([
			analyticsService.dashboardSummary(),
			analyticsService.hiveHealth(),
			// Total per month, last 6 months (empty months = 0) — matches
			// the "Yield This Month" number shown above the chart.
			analyticsService.monthlyYield(6),
			pesticideService.listActiveAlerts(),
		]);

		if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
		else setErrorMsg(summaryRes.message);

		if (healthRes.success && healthRes.data) setHiveHealth(healthRes.data);
		if (trendRes.success && trendRes.data) setTrend(trendRes.data);
		if (alertsRes.success && alertsRes.data) setAlerts(alertsRes.data);

		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		const handler = () => load();
		window.addEventListener(ALERTS_CHANGED_EVENT, handler);
		window.addEventListener(HIVES_CHANGED_EVENT, handler);
		return () => {
			window.removeEventListener(ALERTS_CHANGED_EVENT, handler);
			window.removeEventListener(HIVES_CHANGED_EVENT, handler);
		};
	}, [load]);

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

	const recentAlerts = [...alerts].sort(
		(a, b) =>
			new Date(b.scheduled_date).getTime() -
			new Date(a.scheduled_date).getTime(),
	);

	return (
		<div className="w-full lg:h-full h-auto lg:overflow-hidden overflow-y-auto lg:p-5 p-0 flex items-start flex-col gap-3 scrollbar-none">
			<div className="lg:static sticky top-0 z-20 w-full bg-[#fffdf5] lg:bg-transparent lg:pb-0 pb-2">
				<UserNav />
			</div>

			<div className="w-full flex lg:flex-row flex-col gap-3 lg:px-0 px-5">
				<div className="lg:w-1/3 w-full flex flex-col gap-3">
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

				<div className="lg:w-2/3 w-full flex lg:flex-row flex-col items-stretch gap-3">
					<GraphContainer title="hive health">
						<HiveHealthChart data={hiveHealthChartData} />
					</GraphContainer>
					{/* NEW — clicking this card now navigates to the
					    History tab, which shows the fuller per-hive
					    version of the same yield trend. */}
					<GraphContainer
						title="yield summary"
						onClick={() => router.push("/beekeeper/history")}>
						<YieldSummaryChart
							value={formatKg(
								summary?.yield_totals.this_month.total_kg,
							)}
							valueLabel="Yield This Month"
							changeAmount={
								summary?.yield_totals.change_amount ?? 0
							}
							changePercent={
								summary?.yield_totals.change_percent ?? null
							}
							changeLabel="vs last month"
							categories={
								trend.categories.length
									? trend.categories
									: ["No data"]
							}
							data={trend.data.length ? trend.data : [0]}
						/>
					</GraphContainer>
				</div>
			</div>

			{errorMsg && (
				<p className="text-xs text-red-600 px-2">{errorMsg}</p>
			)}

			{/* Shown only while the beekeeper's account isn't verified yet —
			    a nudge toward completing verification, right above the
			    Operations panel it affects (unverified beekeepers can't
			    accept rescue jobs from the Report tab either). */}
			{user?.role === "beekeeper" &&
				user.verification_status !== "Verified" && (
					<div className="w-full bg-[#FAEEDA] border-2 border-[#FAC775] border-solid rounded-lg p-3 flex items-center gap-2">
						<Icon
							icon="octicon:alert-16"
							className="w-5 h-5 shrink-0 text-[#854F0B]"
						/>
						<p className="Poppins-SemiBold text-[#854F0B] text-xs">
							Your account isn&apos;t verified yet — verify to
							unlock the Report tab and start accepting rescue
							jobs.
						</p>
						<span
							onClick={() => router.push("/beekeeper/profile")}
							className="Poppins-SemiBold text-xs text-[#854F0B] underline cursor-pointer ml-auto shrink-0">
							Verify now
						</span>
					</div>
				)}

			{/* LOWER CONTAINER */}
			<div className="w-full lg:flex-1 flex lg:flex-row flex-col items-stretch lg:gap-3 gap-0 lg:min-h-0 min-h-200 px-0">
				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
							Operations{" "}
							<span
								className={`text-xs text-[#ffce1c] cursor-pointer ${operations.length > 0 ? "block" : "hidden"}`}
								onClick={() =>
									router.push("/beekeeper/report")
								}>
								view all
							</span>
						</span>

						{operationsLoading ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-hidden p-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<OperationSkeleton key={i} />
								))}
							</div>
						) : operations.length > 0 ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 p-2">
								{operations.map((r) => (
									<OperationItem
										key={r.reportID}
										report={r}
										onClick={() =>
											openModal("BeeReport", {
												reportId: r.reportID,
											})
										}
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
									{isVerified
										? "No Operations"
										: "Verify your account"}
								</h2>
								{/* Unverified: nothing loads here — say why. */}
								{!isVerified && user?.role === "beekeeper" && (
									<p className="text-xs text-[#817b70] mt-1 px-6">
										Rescue reports near you show up here
										once an admin verifies your account.
									</p>
								)}
								{operationsError && (
									<p className="text-xs text-red-600 mt-1 px-4">
										{operationsError}
									</p>
								)}
							</div>
						)}
					</div>
				</Container>

				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
							Recent Alerts{" "}
							<span
								className={`text-xs text-[#ffce1c] cursor-pointer ${recentAlerts.length > 0 ? "block" : "hidden"}`}
								onClick={() => router.push("/beekeeper/alert")}>
								view all
							</span>
						</span>

						{loading && recentAlerts.length === 0 ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-hidden p-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<PesticideAlertSkeleton key={i} />
								))}
							</div>
						) : recentAlerts && recentAlerts.length > 0 ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 p-2">
								{recentAlerts.map((a) => (
									<PesticideAlert
										key={a.alert_id}
										location={getAlertLocation(
											a,
											resolvedLocations,
										)}
										date={new Date(
											a.scheduled_date,
										).toLocaleDateString()}
										time={new Date(
											a.scheduled_date,
										).toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
										status={
											a.risk_level.toLowerCase() as
												| "high"
												| "medium"
												| "low"
										}
										onClick={() =>
											router.push(
												`/beekeeper/alert/details?id=${a.alert_id}`,
											)
										}
										// Your own alert still waiting for the admin.
										approvalStatus={a.approval_status}
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
