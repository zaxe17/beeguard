"use client";

import { ReportCard } from "@/components/ui/ReportCard";
import { NavTab } from "@/components/Tab";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { adminService, type AdminReport } from "@/services/admin";
import { AdminReportModal } from "@/components/modal/AdminReportModal";
import {
	formatDate,
	formatTime,
	reportImageSrc,
	toAdminUiStatus,
} from "@/services/citizenReport";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "in-progress" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Cancelled", value: "cancelled" },
];

// New reports appear without a page refresh.
const LIST_POLL_MS = 30000;

const ReportsInner = () => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("tab") || "all";
	// Report open in the details popup. ?report=<id> opens one directly
	// (e.g. from the dashboard's Recent Swarm Reports).
	const [openReportId, setOpenReportId] = useState<string | null>(
		searchParams.get("report"),
	);
	// Already on this page and a notification links to another report.
	const reportParam = searchParams.get("report");
	useEffect(() => {
		if (reportParam) setOpenReportId(reportParam);
	}, [reportParam]);

	const [reports, setReports] = useState<AdminReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			const res = await adminService.reports();
			if (cancelled) return;
			if (res.success && res.data) {
				setReports(res.data);
				setErrorMsg(null);
			} else {
				setErrorMsg(res.message || "Couldn't load reports.");
			}
			setLoading(false);
		};
		load();
		const interval = setInterval(load, LIST_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	// Tabs use the same status names as the report cards. Cancelled =
	// cancelled by the citizen (old "False Alarm" rows show there too).
	const filtered = reports.filter((r) => {
		if (activeStatus === "all") return true;
		return toAdminUiStatus(r.status) === activeStatus;
	});

	return (
		<div className="h-screen pt-10 flex justify-center overflow-hidden">
			<div className="lg:w-1/2 w-full flex flex-col min-h-0">
				<div className="lg:px-0 px-5">
					<NavTab tabs={tabs} />
				</div>

				<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto px-3 my-5 lg:scrollbar-auto scrollbar-none">
					<div className="flex flex-col gap-3 pb-3">
						{loading && (
							<p className="text-center text-sm text-[#a6a3a3] py-4">
								Loading reports…
							</p>
						)}
						{!loading && errorMsg && (
							<p className="text-center text-sm text-red-600 py-4">{errorMsg}</p>
						)}
						{!loading && !errorMsg && filtered.length === 0 && (
							<p className="text-center text-sm text-[#a6a3a3] py-4">
								{reports.length === 0 ? "No reports yet." : "No reports in this tab."}
							</p>
						)}

						{filtered.map((r) => {
							const when = r.sighted_at ?? r.reported_at;
							return (
								<ReportCard
									key={r.reportID}
									status={toAdminUiStatus(r.status)}
									reportId={r.reportID}
									latitude={r.latitude}
									longitude={r.longitude}
									date={formatDate(when)}
									time={
										r.citizen_name
											? `${formatTime(when)} • by ${r.citizen_name}`
											: formatTime(when)
									}
									imageUrl={reportImageSrc(r.image_url)}
									selected={r.reportID === openReportId}
									onClick={() => setOpenReportId(r.reportID)}
								/>
							);
						})}
					</div>
				</div>
			</div>

			{/* Tap a report → full details */}
			<AdminReportModal
				reportId={openReportId}
				onClose={() => setOpenReportId(null)}
			/>
		</div>
	);
};

const AdminReports = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<ReportsInner />
		</Suspense>
	);
};

export default AdminReports;