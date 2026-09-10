"use client";

import { ReportCard } from "@/components/ui/ReportCard";
import { Tab } from "@/components/Tab";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { useModal } from "@/context/ModalContext";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "progress" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Rejected", value: "rejected" },
];

type ModalType = "BeeReport";

const BeekeeperReportsInner = () => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("tab") || "all";
	const reportStatuses = [
		"pending",
		"progress",
		"pending",
		"resolved",
		"resolved",
		"rejected",
		"pending",
		"rejected",
		"resolved",
		"rejected",
		"pending",
	] as const;

	const { openModal } = useModal<ModalType>();

	return (
		<div className="h-full flex justify-center">
			<div className="lg:w-1/2 w-full flex flex-col min-h-0">
				<div className="w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="Poppins-SemiBold text-xl text-[#020101] lg:hidden block">
						Report
					</h3>

					<div className="w-full">
						<Tab tabs={tabs} />
					</div>
				</div>

				<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto px-3 my-5">
					<div className="mt-5 flex flex-col gap-3 pb-3">
						{reportStatuses
							.filter(
								(status) =>
									activeStatus === "all" ||
									activeStatus === status,
							)
							.map((status, i) => (
								<ReportCard
									onClick={() => openModal("BeeReport")}
									key={`${status}-${i}`}
									status={status}
								/>
							))}
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
