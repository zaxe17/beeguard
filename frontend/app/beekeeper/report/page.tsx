"use client";

import { ReportCard } from "@/components/ui/ReportCard";
import { Tab } from "@/components/Tab";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "progress" },
	{ label: "Resolved", value: "resolved" },
	{ label: "Rejected", value: "rejected" },
];

const BeekeeperReportsInner = () => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("status") || "all";
	const reportStatuses = [
		"pending",
		"progress",
		"resolved",
		"rejected",
	] as const;

	return (
		<div className="pt-10 flex justify-center items-center">
			<div className="w-1/2">
				<Tab tabs={tabs} />

				<div className="mt-5">
					{reportStatuses
						.filter(
							(status) =>
								activeStatus === "all" ||
								activeStatus === status,
						)
						.map((status) => (
							<ReportCard key={status} status={status} />
						))}
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
