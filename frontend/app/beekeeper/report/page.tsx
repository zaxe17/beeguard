"use client";

import { ReportCard } from "@/components/ui/ReportCard";
import { NavTab } from "@/components/Tab";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useModal } from "@/context/ModalContext";
import { useAuth } from "@/context/AuthContext";
import {
	BEEKEEPER_REPORTS_CHANGED_EVENT,
	beekeeperReportService,
	type BeekeeperReport,
} from "@/services/beekeeperReport";
import {
	formatDate,
	formatTime,
	reportImageSrc,
} from "@/services/citizenReport";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "in-progress" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Rejected", value: "rejected" },
];

type ModalType = "BeeReport";
// Read by <BeeReport /> (ReportModal.tsx) to load the right report.
type BeeReportPayload = { reportId: string };

// New citizen reports appear without a page refresh.
const LIST_POLL_MS = 15000;

// Shown instead of the report list when the beekeeper's account
// isn't verified yet — the Sidebar already hides/locks this tab, but
// a direct URL visit should still be blocked here rather than
// showing an empty/broken report list.
const NotVerifiedNotice = () => (
	<div className="h-full flex flex-col items-center justify-center gap-3 text-center px-5">
		<Icon icon="mdi:shield-alert-outline" className="w-16 h-16 text-[#a6a3a3]" />
		<h3 className="Poppins-SemiBold text-lg text-[#4a2f00]">
			Verify your account to view reports
		</h3>
		<p className="text-sm text-[#817b70] max-w-sm">
			Bee rescue reports are only available to verified beekeepers.
			Head to your profile to submit your verification documents.
		</p>
	</div>
);

const BeekeeperReportsInner = () => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("tab") || "all";
	const { user, loading } = useAuth();
	const { openModal } = useModal<ModalType, BeeReportPayload>();

	const isVerified =
		user?.role === "beekeeper" && user.verification_status === "Verified";

	const [reports, setReports] = useState<BeekeeperReport[]>([]);
	const [listLoading, setListLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const loadReports = useCallback(async () => {
		const res = await beekeeperReportService.list();
		if (res.success && res.data) {
			setReports(res.data);
			setErrorMsg(null);
		} else {
			setErrorMsg(res.message || "Couldn't load reports.");
		}
		setListLoading(false);
	}, []);

	useEffect(() => {
		if (!isVerified) return;
		loadReports();
		const interval = setInterval(loadReports, LIST_POLL_MS);
		window.addEventListener(BEEKEEPER_REPORTS_CHANGED_EVENT, loadReports);
		return () => {
			clearInterval(interval);
			window.removeEventListener(BEEKEEPER_REPORTS_CHANGED_EVENT, loadReports);
		};
	}, [isVerified, loadReports]);

	if (loading) {
		return (
			<div className="h-full flex items-center justify-center text-[#817b70]">
				Loading...
			</div>
		);
	}

	if (!isVerified) {
		return <NotVerifiedNotice />;
	}

	const filtered = reports.filter(
		(r) => activeStatus === "all" || activeStatus === r.beekeeper_status,
	);

	return (
		<div className="h-full flex justify-center">
			<div className="lg:w-1/2 w-full flex flex-col min-h-0">
				<div className="w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="Poppins-SemiBold text-xl text-[#020101] lg:hidden block">
						Report
					</h3>

					<div className="w-full">
						<NavTab tabs={tabs} />
					</div>
				</div>

				<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto px-3 my-5 lg:scrollbar-auto scrollbar-none">
					<div className="mt-5 flex flex-col gap-3 lg:pb-3 pb-0">
						{listLoading && (
							<p className="text-center text-sm text-[#a6a3a3] py-4">
								Loading reports…
							</p>
						)}
						{!listLoading && errorMsg && (
							<p className="text-center text-sm text-red-600 py-4">{errorMsg}</p>
						)}
						{!listLoading && !errorMsg && filtered.length === 0 && (
							<p className="text-center text-sm text-[#a6a3a3] py-4">
								{reports.length === 0
									? "No bee reports near your farm right now."
									: "No reports in this tab."}
							</p>
						)}

						{filtered.map((r) => {
							const when = r.sighted_at ?? r.reported_at;
							return (
								<ReportCard
									key={r.reportID}
									onClick={() => openModal("BeeReport", { reportId: r.reportID })}
									status={r.beekeeper_status}
									reportId={r.reportID}
									latitude={r.latitude}
									longitude={r.longitude}
									date={formatDate(when)}
									time={
										r.distance_km != null
											? `${formatTime(when)} • ${r.distance_km} km away`
											: formatTime(when)
									}
									imageUrl={reportImageSrc(r.image_url)}
								/>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

const BeekeeperReports = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<BeekeeperReportsInner />
		</Suspense>
	);
};

export default BeekeeperReports;