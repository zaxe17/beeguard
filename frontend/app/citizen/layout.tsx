"use client";

import React, { Suspense } from "react";
import { BeeIdentify, SwarmNotice } from "@/components/modal/ReportModal";
import { ModalProvider, useModal } from "@/context/ModalContext";
import { Delete, Report } from "@/components/modal/ChatModal";
import { ReportFlowProvider, useReportFlow } from "@/context/ReportFlowContext";
import BeeGuardLayout from "@/components/BeeGuardLayout";

type ModalType = "beeIdentify" | "swarmNotice" | "DeleteChat" | "ReportChat";

// PUT MODAL HERE IN THIS FUNCTION
const MyModal = () => {
	const { isModalOpen, closeModal, openModal } = useModal<ModalType>();
	const { advanceStep } = useReportFlow();

	return (
		<>
			<BeeIdentify
				isOpen={isModalOpen("beeIdentify")}
				onClose={closeModal}
				onSubmit={() => {
					closeModal();
					openModal("swarmNotice");
				}}
			/>
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
		</>
	);
};

const CitizenLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<ModalProvider>
			<ReportFlowProvider>
				<Suspense fallback={null}>
					{/* BODY LAYOUT */}
					<BeeGuardLayout content={children} modal={<MyModal />} />
				</Suspense>
			</ReportFlowProvider>
		</ModalProvider>
	);
};

export default CitizenLayout;
