"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { useModal } from "@/context/ModalContext";
import { usePathname } from "next/navigation";
import { useIsPage } from "@/hooks/useIsPage";

type ModalType = "beeIdentify" | "swarmNotice";

// STEPS
const Steps = () => {
	const location = useIsPage("/citizen/report/submitted");

	return (
		<div
			className={`lg:w-1/2 w-full relative items-center justify-between ${location ? "hidden" : "flex"}`}>
			<div className="relative z-10 w-full flex items-center justify-between">
				{[1, 2, 3].map((step) => (
					<div
						key={step}
						className="Poppins-SemiBold bg-white w-13 h-13 border-3 border-[#ffce1c] text-[#a6a3a3] text-3xl flex justify-center items-center rounded-full">
						{step}
					</div>
				))}
			</div>
			{/* LINE */}
			<div className="absolute h-1 w-full bg-[#ffce1c] overflow-hidden"></div>
		</div>
	);
};

const ReportLayout = ({ children }: { children?: React.ReactNode }) => {
	const { openModal } = useModal<ModalType>();
	const location = useIsPage("/citizen/report/submitted");

	return (
		<div className="w-full h-full p-5 flex items-start flex-col gap-3">
			{/* CONTAINER */}
			<Container width="100%" height="100%" scroll>
				{/* TITLE */}
				<div className={`${location ? "hidden" : "block"}`}>
					<h2 className="Poppins-Bold text-5xl text-[#4a2f00]">
						Report a Swarm
					</h2>
					<span className="Poppins-SemiBold text-[#817b70]">
						Take or upload a photo of the swarm.
					</span>
				</div>

				{/* WRAPPER OF REPORT */}
				<div className="w-full h-full pb-3 flex flex-col items-center gap-3">
					{/* STEPS */}
					<Steps />

					{/* CONTENT */}
					<div className="w-full flex-1 flex flex-col">
						{children}
					</div>

					{/* BUTTON */}
					<div
						className={`w-full flex justify-center ${location ? "hidden" : "flex"}`}>
						<Button
							width="50%"
							label="Next"
							onClick={() => openModal("swarmNotice")}
						/>
					</div>
				</div>
			</Container>
		</div>
	);
};

export default ReportLayout;
