"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/Button";

type ReportSubmittedProps = {
	reportId?: string | null;
	// Starts a fresh report (step 1). Supplied by the caller because
	// only the report flow knows how to reset itself.
	onReportAnother: () => void;
};

// "Report Submitted!" screen — shown right on the Report page after a
// successful submit (app/citizen/report/page.tsx), and also by the
// /citizen/report/submitted route for direct links.
const ReportSubmitted = ({ reportId, onReportAnother }: ReportSubmittedProps) => {
	const router = useRouter();

	// Opens Documents with the new report already selected.
	const viewReportsHref = reportId
		? `/citizen/document?report=${encodeURIComponent(reportId)}`
		: "/citizen/document";

	return (
		<div className="w-full h-full p-5 flex items-center justify-center flex-col gap-3">
			{/* ICON */}
			<div className="lg:w-30 w-20 lg:h-30 h-20 border-8 border-[#00cc00]/40 rounded-full">
				<Icon
					icon="akar-icons:circle-check-fill"
					className="w-full h-full text-[#00cc00]"
				/>
			</div>

			{/* TITLE */}
			<h1 className="Poppins-Bold text-[#1f6f5f] lg:text-6xl text-4xl text-center">
				Report Submitted!
			</h1>

			{/* SUB TITLE */}
			<p className="text-[#545454] text-base text-center leading-4 mt-5">
				Thank you! report has been sent to <br />
				nearby beekeepers.
			</p>

			{/* REPORT ID — only when we know which report was just sent */}
			{reportId ? (
				<>
					<span className="Poppins-SemiBold text-lg leading-2 mt-5">
						Report ID
					</span>
					<h3 className="bg-[#ffce1c]/40 text-3xl py-2 px-6 rounded-2xl mb-8">
						#{reportId}
					</h3>
				</>
			) : (
				<div className="mb-8" />
			)}

			{/* VIEW REPORTS */}
			<Button
				buttonType="button"
				width="lg:w-1/3 w-1/2"
				label="View Reports"
				onClick={() => router.push(viewReportsHref)}
			/>
			{/* REPORT ANOTHER */}
			<Button
				buttonType="button"
				width="lg:w-1/3 w-1/2"
				label="Report Another Swarm"
				bgNone
				onClick={onReportAnother}
			/>
			{/* BACK HOME FOR HOME */}
			<Link
				href="/citizen"
				className="Poppins-Bold underline text-[#a6a3a3] hover:text-[#817b70] transition-colors duration-130">
				Back to Home
			</Link>
		</div>
	);
};

export default ReportSubmitted;