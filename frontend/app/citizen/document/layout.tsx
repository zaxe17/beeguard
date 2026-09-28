"use client";

import MobileOverlay from "@/components/MobileOverlay";
import { NavTab } from "@/components/Tab";
import { Container } from "@/components/ui/Container";
import { ReportCard } from "@/components/ui/ReportCard";
import { Icon } from "@iconify/react";
import { AnimatePresence } from "framer-motion";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useQueryParamState } from "@/hooks/useQueryParamState";
import { api } from "@/services/api";
import {
	type ApiReport,
	REPORTS_CHANGED_EVENT,
	formatDate,
	formatTime,
	matchesTab,
	reportImageSrc,
	reportWhen,
	toUiStatus,
} from "@/services/citizenReport";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "progress" },
	{ label: "Resolved", value: "resolved" },
];

// Picks up status changes made elsewhere (e.g. a beekeeper accepting
// or resolving) without a page refresh.
const LIST_POLL_MS = 15000;

const CitizenReportInner = ({ children }: { children: React.ReactNode }) => {
	// "?tab=..." — ginagamit na lang natin yung value dito, hindi na
	// kailangan i-set/clear sa page na ito (ang NavTab component na
	// mismo ang gumagawa niyan internally, ayon sa dating code).
	const { value: activeStatusParam } = useQueryParamState("tab");
	const activeStatus = activeStatusParam || "all";

	// "?report=<id>" — set kapag pinili yung card, clear kapag
	// bumalik sa mobile overlay.
	const {
		value: selectedReportId,
		setValue: openReport,
		clearValue: closeReport,
	} = useQueryParamState("report");

	const [reports, setReports] = useState<ApiReport[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const loadReports = useCallback(async () => {
		const res = await api.get<ApiReport[]>("/reports");
		if (res.success && res.data) {
			setReports(res.data);
			setErrorMsg(null);
		} else {
			setErrorMsg(res.message || "Couldn't load your reports.");
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		loadReports();
		const interval = setInterval(loadReports, LIST_POLL_MS);
		window.addEventListener(REPORTS_CHANGED_EVENT, loadReports);
		return () => {
			clearInterval(interval);
			window.removeEventListener(REPORTS_CHANGED_EVENT, loadReports);
		};
	}, [loadReports]);

	const filteredReports = reports.filter((r) => matchesTab(r.status, activeStatus));

	// With no ?report=, the details page shows the newest report —
	// highlight that one so the two sides agree.
	const highlightedId = selectedReportId ?? reports[0]?.reportID ?? null;

	return (
		<div className="w-full h-full flex items-start relative">
			{/* CONTAINER FOR REPORT LIST */}
			<Container
				height="100%"
				borderNone
				className="lg:w-[35%] w-full h-full shrink-0">
				<div className="w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="Poppins-SemiBold text-xl text-[#020101]">
						My Reports
					</h3>

					{/* TAB BUTTONS */}
					<div className="w-full">
						<NavTab tabs={tabs} />
					</div>
				</div>

				{/* SCROLLABLE REPORT CARDS */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					{loading && (
						<p className="text-center text-sm text-[#a6a3a3] py-4">
							Loading your reports…
						</p>
					)}
					{!loading && errorMsg && (
						<p className="text-center text-sm text-red-600 py-4">{errorMsg}</p>
					)}
					{!loading && !errorMsg && filteredReports.length === 0 && (
						<p className="text-center text-sm text-[#a6a3a3] py-4">
							{reports.length === 0
								? "You haven't submitted any reports yet."
								: "No reports in this tab."}
						</p>
					)}

					<div className="flex flex-col">
						{filteredReports.map((report) => {
							const when = reportWhen(report);
							return (
								<div
									key={report.reportID}
									onClick={() => openReport(report.reportID)}
									className="cursor-pointer">
									<ReportCard
										status={toUiStatus(report.status)}
										reportId={report.reportID}
										latitude={report.latitude}
										longitude={report.longitude}
										date={formatDate(when)}
										time={formatTime(when)}
										imageUrl={reportImageSrc(report.image_url)}
										selected={report.reportID === highlightedId}
									/>
								</div>
							);
						})}
					</div>
				</div>
			</Container>

			{/* RIGHT SIDE — desktop: always visible inline */}
			<div className="hidden lg:block flex-1 h-full w-full min-h-0 overflow-y-auto">
				<div className="flex flex-col items-center py-8 px-25 w-full">
					{children}
				</div>
			</div>

			{/* RIGHT SIDE — mobile: slide-up overlay, only after a card is clicked */}
			<AnimatePresence>
				{selectedReportId && (
					<MobileOverlay>
						{/* BACK BUTTON */}
						<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6]">
							<button
								onClick={closeReport}
								className="absolute flex items-center shrink-0">
								<Icon
									icon="bx:arrow-back"
									className="text-2xl text-[#ffa004]"
								/>
							</button>
							<span className="w-full Poppins-SemiBold text-sm text-[#4a2f00] text-center">
								Report Details
							</span>
						</div>
						<div className="flex flex-col items-center py-4 px-4 w-full">
							{children}
						</div>
					</MobileOverlay>
				)}
			</AnimatePresence>
		</div>
	);
};

const ReportLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<CitizenReportInner>{children}</CitizenReportInner>
		</Suspense>
	);
};

export default ReportLayout;