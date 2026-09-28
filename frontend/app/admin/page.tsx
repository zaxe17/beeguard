"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TotalStatusCard } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { UserNav } from "@/components/UserNav";
import { Icon } from "@iconify/react";
import { ReportCard } from "@/components/ui/ReportCard";
import { ReportOverview } from "@/components/graph/Line";
import { adminService, type AdminDashboard } from "@/services/admin";
import {
	formatDate,
	formatTime,
	reportImageSrc,
	toAdminUiStatus,
} from "@/services/citizenReport";

const formatCount = (n: number | undefined) => (n ?? 0).toLocaleString();

const AdminDashboardPage = () => {
	const router = useRouter();
	const [data, setData] = useState<AdminDashboard | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		adminService.dashboard().then((res) => {
			if (cancelled) return;
			if (res.success && res.data) setData(res.data);
			else setErrorMsg(res.message || "Couldn't load the dashboard.");
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const counts = data?.counts;
	const changes = data?.changes;
	const statusCard = [
		{
			icon: "fa7-solid:people-group",
			count: loading ? "…" : formatCount(counts?.citizens),
			title: "Citizen",
			change: changes?.citizens,
			upIsBad: false,
			color: "#38b6ff",
		},
		{
			icon: "mdi:beekeeper",
			count: loading ? "…" : formatCount(counts?.beekeepers),
			title: "Beekeepers",
			change: changes?.beekeepers,
			upIsBad: false,
			color: "#ffdb4f",
		},
		{
			icon: "pinhead:bee",
			count: loading ? "…" : formatCount(counts?.reports),
			title: "Swarm Reports",
			change: changes?.reports,
			upIsBad: false,
			color: "#ff9a00",
		},
		{
			icon: "boxicons:alert-triangle-filled",
			count: loading ? "…" : formatCount(counts?.active_alerts),
			title: "Active Alerts",
			change: changes?.active_alerts,
			upIsBad: true,
			color: "#ff0000",
		},
	];

	const overview = data?.reports_overview;
	const recent = data?.recent_reports ?? [];

	return (
		<div className="w-full h-full lg:overflow-hidden overflow-y-auto lg:p-5 p-0 flex items-start flex-col gap-3 lg:scrollbar-auto scrollbar-none">
			<div className="lg:static sticky top-0 z-20 w-full bg-[#fffdf5] lg:bg-transparent lg:pb-0 pb-2">
				<UserNav />
			</div>

			{/* TOP */}
			<div className="w-full flex flex-col gap-3 lg:px-0 px-5 shrink-0">
				<h2 className="Poppins-SemiBold text-[#a6a3a3] text-2xl">
					Dashboard
				</h2>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				{/* Beekeepers waiting for verification */}
				{!!counts?.pending_verifications && (
					<div className="w-full bg-[#FAEEDA] border-2 border-[#FAC775] border-solid rounded-lg p-3 flex items-center gap-2">
						<Icon icon="mdi:shield-account" className="w-5 h-5 shrink-0 text-[#854F0B]" />
						<p className="Poppins-SemiBold text-[#854F0B] text-xs">
							{counts.pending_verifications} beekeeper
							{counts.pending_verifications === 1 ? " is" : "s are"} waiting for
							verification.
						</p>
						<span
							onClick={() => router.push("/admin/profile?tab=verification")}
							className="Poppins-SemiBold text-xs text-[#854F0B] underline cursor-pointer ml-auto shrink-0">
							Review now
						</span>
					</div>
				)}

				{/* Beekeeper pesticide alerts waiting for approval */}
				{!!counts?.pending_alerts && (
					<div className="w-full bg-[#FAEEDA] border-2 border-[#FAC775] border-solid rounded-lg p-3 flex items-center gap-2">
						<Icon icon="mdi:clock-alert-outline" className="w-5 h-5 shrink-0 text-[#854F0B]" />
						<p className="Poppins-SemiBold text-[#854F0B] text-xs">
							{counts.pending_alerts} pesticide alert
							{counts.pending_alerts === 1 ? " is" : "s are"} waiting for
							approval.
						</p>
						<span
							onClick={() => router.push("/admin/alert?tab=pending")}
							className="Poppins-SemiBold text-xs text-[#854F0B] underline cursor-pointer ml-auto shrink-0">
							Review now
						</span>
					</div>
				)}

				<div className="w-full grid lg:grid-cols-4 grid-cols-2 gap-3">
					{statusCard.map((c, i) => (
						<TotalStatusCard
							key={i}
							icon={c.icon}
							count={c.count}
							title={c.title}
							color={c.color}
							change={c.change}
							upIsBad={c.upIsBad}
						/>
					))}
				</div>
			</div>

			<div className="w-full lg:flex-1 flex lg:flex-row flex-col items-stretch gap-3 min-h-0 px-0 lg:pb-0 pb-5">
				<div className="w-full h-100 shrink-0 lg:h-auto lg:shrink lg:flex-1 min-h-0">
					<Container width="100%" height="100%" scroll>
						<div className="w-full h-full flex flex-col items-start">
							<span className="sticky top-0 w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
								Reports Overview
							</span>

							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0">
								{/* One line per status: Pending, In Progress,
								    Resolved, Cancelled (reports per month). */}
								<ReportOverview
									categories={overview?.categories.length ? overview.categories : ["No data"]}
									series={
										overview?.series?.length
											? overview.series
											: [
													{ key: "pending", label: "Pending", data: [0] },
													{ key: "in-progress", label: "In Progress", data: [0] },
													{ key: "resolved", label: "Resolved", data: [0] },
													{ key: "cancelled", label: "Cancelled", data: [0] },
												]
									}
								/>
							</div>
						</div>
					</Container>
				</div>

				<div className="w-full h-100 shrink-0 lg:h-auto lg:shrink lg:flex-1 min-h-0">
					<Container width="100%" height="100%" scroll>
						<div className="w-full h-full flex flex-col items-start">
							<span className="sticky top-0 w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
								Recent Swarm Reports
								<span
									className="text-xs text-[#ffce1c] cursor-pointer"
									onClick={() => router.push("/admin/report")}>
									view all
								</span>
							</span>

							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0">
								{!loading && recent.length === 0 && (
									<p className="text-center text-sm text-[#a6a3a3] py-4 w-full">
										No reports yet.
									</p>
								)}
								{recent.map((r) => {
									const when = r.sighted_at ?? r.reported_at;
									return (
										<ReportCard
											key={r.reportID}
											status={toAdminUiStatus(r.status)}
											reportId={r.reportID}
											latitude={r.latitude}
											longitude={r.longitude}
											date={formatDate(when)}
											time={formatTime(when)}
											imageUrl={reportImageSrc(r.image_url)}
											onClick={() =>
												router.push(
													`/admin/report?report=${encodeURIComponent(r.reportID)}`,
												)
											}
										/>
									);
								})}
							</div>
						</div>
					</Container>
				</div>
			</div>
		</div>
	);
};

export default AdminDashboardPage;