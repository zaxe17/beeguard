"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReportDetails from "@/components/ReportDetails";
import { Container } from "@/components/ui/Container";
import { Beekeeper } from "@/components/Beekeeper";
import { dummyReports } from "@/data/reports";

const Offer = () => {
	return (
		<Container width="100%" className="shrink-0 max-w-2xl">
			<span className="Poppins-SemiBold text-[#a6a3a3] text-base">
				Choose Offer
			</span>
			<div className="w-full max-h-70 overflow-y-scroll flex flex-col pr-1">
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
			</div>
		</Container>
	);
};

const Payment = ({ status }: { status: "progress" | "resolved" }) => {
	const isResolved = status === "resolved";

	return (
		<div className="w-full">
			<p className="Poppins-SemiBold text-[#a6a3a3] text-base mb-2">
				Beekeeper Assigned
			</p>
			<Beekeeper
				button={isResolved ? "resolved" : "message"}
				onSubmitRating={(rating) =>
					console.log("Submitted rating:", rating)
				}
			/>
		</div>
	);
};

const DocumentContent = () => {
	const searchParams = useSearchParams();
	const reportId = searchParams.get("report");

	const activeReport =
		dummyReports.find((r) => r.reportId === reportId) ?? dummyReports[0];

	return (
		<>
			<h1 className="Poppins-SemiBold text-xl pb-5 lg:block hidden">
				Report Details
			</h1>

			<ReportDetails
				status={activeReport.status}
				reportId={activeReport.reportId}
				specification={activeReport.specification}
				location={activeReport.location}
				date={activeReport.date}
				time={activeReport.time}
				details={activeReport.details}
				activity={activeReport.activity}
				danger={activeReport.danger}
			/>

			{/* PENDING = pagpili ng beekeeper offer; PROGRESS/RESOLVED = assigned na, bayad/rating na lang */}
			{activeReport.status === "pending" ? (
				<Offer />
			) : (
				<Payment status={activeReport.status} />
			)}
		</>
	);
};

const Document = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DocumentContent />
		</Suspense>
	);
};

export default Document;
