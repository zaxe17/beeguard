"use client";

import { Tab } from "@/components/Tab";
import { Container } from "@/components/ui/Container";
import { ReportCard } from "@/components/ui/ReportCard";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "progress" },
	{ label: "Resolved", value: "resolved" },
];

const CitizenReportInner = ({ children }: { children: React.ReactNode }) => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("status") || "all";
	const reportStatuses = [
		"pending",
		"progress",
		"resolved",
	] as const;

	return (
		<div className="w-full h-full flex items-start">
			{/* CONTAINER FOR BEEFARM LOCATION TAB */}
			<Container width="35%" height="100%" borderNone>
				<div className="w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="Poppins-SemiBold text-xl text-[#020101]">
						My Reports
					</h3>

					{/* TAB BUTTONS */}
					<div className="w-full">
						<Tab tabs={tabs} />
					</div>
				</div>

				{/* SCROLLABLE BEEFARM CARD */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0">
					{/* CHILDREN FOR TABS */}
					<div className="flex flex-col">
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
			</Container>

			{/* RIGHT SIDE */}
			<div className="flex-1 h-full w-full min-h-0 overflow-y-auto">
				<div className="flex flex-col items-center py-8 px-25 w-full">
					{children}
				</div>
			</div>
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
