"use client";

import { ReportCard } from "@/components/ui/ReportCard";
import { NavTab } from "@/components/Tab";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "progress" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Rejected", value: "rejected" },
];

const ReportsInner = () => {
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

	return (
		<div className="h-screen pt-10 flex justify-center overflow-hidden">
			<div className="lg:w-1/2 w-full flex flex-col min-h-0">
				<div className="lg:px-0 px-5">
					<NavTab tabs={tabs} />
				</div>

				<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto px-3 my-5">
					<div className="flex flex-col gap-3 pb-3">
						{reportStatuses
							.filter(
								(status) =>
									activeStatus === "all" ||
									activeStatus === status,
							)
							.map((status, i) => (
								<ReportCard
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

const AdminReports = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<ReportsInner />
		</Suspense>
	);
};

export default AdminReports;
