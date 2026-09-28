// app/guest/layout.tsx
"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ModalProvider, useModal } from "@/context/ModalContext";
import { SignupModal } from "@/components/modal/SignupModal";

/**
 * GUEST BEE IDENTIFICATION — http://localhost:5000/guest
 * No login needed. Reached from "use bee identification" on the login page.
 * The sign-up popup lives here; page.tsx opens it (via useModal) as soon
 * as a photo has been taken/uploaded and identified.
 */
type ModalType = "signup";

const GuestLayoutContent = ({ children }: { children?: React.ReactNode }) => {
	const { isModalOpen, closeModal, openModal } = useModal<ModalType>();

	return (
		<div className="w-full h-screen lg:p-5 p-3 flex items-center justify-center flex-col gap-3 min-h-0">
			{/* CONTAINER */}
			<Container width="lg:w-1/2 w-full" height="100%" scroll>
				<div className="w-full h-full flex flex-col min-h-0">
					{/* TITLE */}
					<div className="shrink-0">
						<h2 className="Poppins-Bold lg:text-5xl text-2xl text-[#4a2f00]">
							What Bee Is This?
						</h2>
					</div>

					{/* WRAPPER */}
					<div className="w-full flex-1 min-h-0 pb-3 flex flex-col items-center gap-3">
						{/* CONTENT */}
						<div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto pt-3">
							{children}
						</div>

						{/* BUTTON */}
						<div className="w-full shrink-0 flex justify-center">
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
			<SignupModal isOpen={isModalOpen("signup")} onClose={closeModal} />
		</div>
	);
};

const GuestLayout = ({ children }: { children?: React.ReactNode }) => {
	return (
		<ModalProvider>
			<GuestLayoutContent>{children}</GuestLayoutContent>
		</ModalProvider>
	);
};

export default GuestLayout;