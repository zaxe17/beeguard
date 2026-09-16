"use client";

import React, { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { BeeIdentify, SwarmNotice } from "@/components/modal/ReportModal";
import { ModalProvider, useModal } from "@/context/ModalContext";

type ModalType = "beeIdentify" | "swarmNotice";

const CitizenLayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { isModalOpen, closeModal } = useModal<ModalType>();

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
			/>
			<SwarmNotice
				isOpen={isModalOpen("swarmNotice")}
				onClose={closeModal}
			/>
		</div>
	);
};

const CitizenLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<ModalProvider>
			<Suspense fallback={null}>
				<CitizenLayoutContent>{children}</CitizenLayoutContent>
			</Suspense>
		</ModalProvider>
	);
};

export default CitizenLayout;
