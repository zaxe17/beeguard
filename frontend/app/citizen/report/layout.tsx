"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Button, CancelButton } from "@/components/ui/Button";
import { usePathname } from "next/navigation";
import { useIsPage } from "@/hooks/useIsPage";
import { useReportFlow } from "@/context/ReportFlowContext";

// STEPS
const Steps = () => {
	const { step, submission } = useReportFlow();
	// Hidden on the "Report Submitted!" screen (route or in-page).
	const location = useIsPage("/citizen/report/submitted") || !!submission;

	return (
		<div
			className={`lg:w-1/2 w-full relative items-center justify-between ${location ? "hidden" : "flex"}`}>
			<div className="relative z-10 w-full flex items-center justify-between">
				{[1, 2, 3].map((s) => (
					<div
						key={s}
						className={`Poppins-SemiBold w-13 h-13 border-3 border-[#ffce1c] text-3xl flex justify-center items-center rounded-full ${
							s === step
								? "bg-[#ffce1c] text-white"
								: s < step
									? "bg-white text-[#4a2f00]"
									: "bg-white text-[#a6a3a3]"
						}`}>
						{s}
					</div>
				))}
			</div>
			{/* LINE */}
			<div className="absolute h-1 w-full bg-[#ffce1c] overflow-hidden"></div>
		</div>
	);
};

const ReportLayout = ({ children }: { children?: React.ReactNode }) => {
	const { step, canProceed, scanning, submitting, submission, triggerNext, goBack } =
		useReportFlow();
	// Hidden on the "Report Submitted!" screen (route or in-page).
	const location = useIsPage("/citizen/report/submitted") || !!submission;

	return (
		<div className="w-full h-full lg:p-5 p-3 flex items-start flex-col gap-3 min-h-0">
			{/* CONTAINER */}
			<Container width="100%" height="100%" scroll>
				<div className="w-full h-full flex flex-col min-h-0">
					{/* TITLE */}
					<div className={`shrink-0 ${location ? "hidden" : "block"}`}>
						<h2 className="Poppins-Bold lg:text-5xl text-2xl text-[#4a2f00]">
							Report a Swarm
						</h2>
						<span className="Poppins-SemiBold text-[#817b70]">
							Take or upload a photo of the swarm.
						</span>
					</div>

					{/* WRAPPER OF REPORT */}
					<div className="w-full flex-1 min-h-0 pb-3 flex flex-col items-center gap-3">
						{/* STEPS */}
						<Steps />

						{/* CONTENT */}
						<div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto pt-3">
							{children}
						</div>

						{/* BUTTON */}
						<div
							className={`lg:w-1/2 w-full shrink-0 justify-center items-center gap-3 ${location ? "hidden" : "flex"}`}>
							{/* BACK — steps 2 and 3 keep everything entered so far */}
							{step > 1 && (
								<CancelButton
									label="Back"
									width="w-full"
									onClick={submitting ? undefined : goBack}
								/>
							)}
							<Button
								width="w-full"
								label={
									scanning
										? "Identifying..."
										: submitting
											? "Submitting..."
											: step === 3
												? "Submit Report"
												: "Next"
								}
								onClick={triggerNext}
								disabled={!canProceed || scanning || submitting}
							/>
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
};

export default ReportLayout;