"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import { BeeIdentify, SwarmNotice } from "@/components/modal/ReportModal";
import { ModalProvider, useModal } from "@/context/ModalContext";

type ModalType = "beeIdentify" | "swarmNotice";

const CitizenLayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { isModalOpen, closeModal } = useModal<ModalType>();

	return (
		<div className="w-full h-screen flex flex-row relative">
			<Sidebar />

			<main className="w-full flex flex-col relative">
				<div className="absolute top-0 z-[-2] h-full w-full bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,219,79,0.3),rgba(255,255,255,0))]"></div>
				{children}
			</main>

			{/* ===== REPORT PAGE MODAL ===== */}
			{/* BEE SPECIES */}
			<BeeIdentify
				isOpen={isModalOpen("beeIdentify")}
				onClose={closeModal}
			/>

			{/* SWARM NOTICE */}
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
			<CitizenLayoutContent>{children}</CitizenLayoutContent>
		</ModalProvider>
	);
};

export default CitizenLayout;
