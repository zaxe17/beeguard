"use client";

import React, { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { BeeIdentify, SwarmNotice } from "@/components/modal/ReportModal";
import { ModalProvider, useModal } from "@/context/ModalContext";
import { Delete, Report } from "@/components/modal/ChatModal";
import { ReportFlowProvider, useReportFlow } from "@/context/ReportFlowContext";

type ModalType = "beeIdentify" | "swarmNotice" | "DeleteChat" | "ReportChat";

const CitizenLayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { isModalOpen, closeModal, openModal } = useModal<ModalType>();
	const { advanceStep } = useReportFlow();

	return (
		<div className="w-full h-svh flex lg:flex-row flex-col-reverse overflow-hidden">
			<Sidebar />

			<main className="w-full flex-1 min-h-0 flex flex-col relative overflow-y-auto">
				<div className="absolute top-0 z-[-2] h-full w-full bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,219,79,0.3),rgba(255,255,255,0))]"></div>
				{children}
			</main>

			{/* ===== REPORT PAGE MODAL ===== */}
			<BeeIdentify
				isOpen={isModalOpen("beeIdentify")}
				onClose={closeModal}
				// Confirming the identified species shows the Swarm Notice
				// (fees / offers) next; its Continue is what moves the
				// report flow from step 1 (photo) to step 2 (details).
				onSubmit={() => {
					closeModal();
					openModal("swarmNotice");
				}}
			/>
			{/* Opened by BeeIdentify's "Submit Photo" above.
			    Continue moves the report flow on to step 2 (details). */}
			<SwarmNotice
				isOpen={isModalOpen("swarmNotice")}
				onClose={closeModal}
				onContinue={() => {
					advanceStep();
					closeModal();
				}}
			/>

			<Delete isOpen={isModalOpen("DeleteChat")} onClose={closeModal} />

			<Report isOpen={isModalOpen("ReportChat")} onClose={closeModal} />
		</div>
	);
};

const CitizenLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<ModalProvider>
			<ReportFlowProvider>
				<Suspense fallback={null}>
					<CitizenLayoutContent>{children}</CitizenLayoutContent>
				</Suspense>
			</ReportFlowProvider>
		</ModalProvider>
	);
};

export default CitizenLayout;