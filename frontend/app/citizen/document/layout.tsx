"use client";

import MobileOverlay from "@/components/MobileOverlay";
import { NavTab } from "@/components/Tab";
import { Container } from "@/components/ui/Container";
import { ReportCard } from "@/components/ui/ReportCard";
import { Icon } from "@iconify/react";
import { AnimatePresence } from "framer-motion";
import React, { Suspense } from "react";
import { dummyReports } from "@/data/reports";
import { useQueryParamState } from "@/hooks/useQueryParamState";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "progress" },
	{ label: "Resolved", value: "resolved" },
];

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

	const filteredReports = dummyReports.filter(
		(report) => activeStatus === "all" || activeStatus === report.status,
	);

	return (
		<div className="w-full h-full flex items-start relative">
			{/* CONTAINER FOR BEEFARM LOCATION TAB */}
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

				{/* SCROLLABLE BEEFARM CARD */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					<div className="flex flex-col">
						{filteredReports.map((report) => (
							<div
								key={report.reportId}
								onClick={() => openReport(report.reportId)}
								className="cursor-pointer">
								<ReportCard status={report.status} />
							</div>
						))}
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
