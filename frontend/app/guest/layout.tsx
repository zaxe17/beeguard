"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { useIsPage } from "@/hooks/useIsPage";
import { BeeIdentify } from "@/components/modal/ReportModal";
import { ModalProvider, useModal } from "@/context/ModalContext";
import { Modal } from "@/components/modal/Modal";
import { SignupModal } from "@/components/modal/SignupModal";

type ModalType = "beeIdentify" | "signup";

const ReportLayoutContent = ({ children }: { children?: React.ReactNode }) => {
	const { isModalOpen, closeModal, openModal } = useModal<ModalType>();

	const location = useIsPage("/citizen/report/submitted");

	return (
		<div className="w-full h-screen lg:p-5 p-3 flex items-center justify-center flex-col gap-3 min-h-0">
			{/* CONTAINER */}
			<Container width="lg:w-1/2 w-full" height="100%" scroll>
				<div className="w-full h-full flex flex-col min-h-0">
					{/* TITLE */}
					<div
						className={`shrink-0 ${location ? "hidden" : "block"}`}>
						<h2 className="Poppins-Bold lg:text-5xl text-2xl text-[#4a2f00]">
							What Bee Is This?
						</h2>
					</div>

					{/* WRAPPER OF REPORT */}
					<div className="w-full flex-1 min-h-0 pb-3 flex flex-col items-center gap-3">
						{/* CONTENT */}
						<div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto pt-3">
							{children}
						</div>

						{/* BUTTON */}
						<div
							className={`w-full shrink-0 justify-center ${location ? "hidden" : "flex"}`}>
							<Button
								width="50%"
								label="Next"
								onClick={() => openModal("signup")}
							/>
						</div>
					</div>
				</div>
			</Container>

			{/* MODAL */}
			<BeeIdentify
				isOpen={isModalOpen("beeIdentify")}
				onClose={closeModal}
			/>

			<SignupModal isOpen={isModalOpen("signup")} onClose={closeModal} />
		</div>
	);
};

const ReportLayout = ({ children }: { children?: React.ReactNode }) => {
	return (
		<ModalProvider>
			<ReportLayoutContent>{children}</ReportLayoutContent>
		</ModalProvider>
	);
};

export default ReportLayout;
