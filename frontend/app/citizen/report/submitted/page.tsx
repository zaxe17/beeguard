"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReportSubmitted from "@/components/ReportSubmitted";
import { useReportFlow } from "@/context/ReportFlowContext";

// Kept for direct links / bookmarks (/citizen/report/submitted?id=...).
// A normal submit now shows the same screen right on the Report page
// instead of navigating here (see app/citizen/report/page.tsx).
const ReportSubmitContent = () => {
	const router = useRouter();
	const reportId = useSearchParams().get("id");
	const { resetFlow } = useReportFlow();

	// Make sure the next visit to the Report page starts at step 1.
	useEffect(() => {
		resetFlow();
	}, [resetFlow]);

	return (
		<ReportSubmitted
			reportId={reportId}
			onReportAnother={() => {
				resetFlow();
				router.push("/citizen/report");
			}}
		/>
	);
};

const ReportSubmit = () => {
	// useSearchParams() needs a Suspense boundary in the App Router.
	return (
		<Suspense fallback={null}>
			<ReportSubmitContent />
		</Suspense>
	);
};

export default ReportSubmit;