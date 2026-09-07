"use client";

import MobileOverlay from "@/components/MobileOverlay";
import { Tab } from "@/components/Tab";
import { Container } from "@/components/ui/Container";
import { ReportCard } from "@/components/ui/ReportCard";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "Pendings", value: "pending" },
	{ label: "In Progress", value: "progress" },
	{ label: "Resolved", value: "resolved" },
];

const CitizenReportInner = ({ children }: { children: React.ReactNode }) => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("tab") || "all";
	const reportStatuses = ["pending", "progress", "resolved"] as const;

	// Only matters on mobile — desktop always shows both sides.
	const [mobileSelected, setMobileSelected] = useState(false);

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
								<div
									key={status}
									onClick={() => setMobileSelected(true)}
									className="cursor-pointer">
									<ReportCard status={status} />
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
				{mobileSelected && (
					<MobileOverlay>
						{/* BACK BUTTON */}
						<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6]">
							<button
								onClick={() => setMobileSelected(false)}
								className="flex items-center shrink-0">
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
