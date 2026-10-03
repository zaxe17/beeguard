// app/guest/layout.tsx
"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { ModalProvider } from "@/context/ModalContext";
import { BackButton } from "@/components/ui/Button";

/**
 * GUEST BEE IDENTIFICATION — /guest (no login needed).
 * Reached from "Try Bee Identification" on the login page.
 *
 * Just the frame + title. The steps, the Next button and the popups
 * (bee result -> "log in to submit") live in page.tsx, which needs to
 * know whether a photo was taken before Next can run.
 */
const GuestLayout = ({ children }: { children?: React.ReactNode }) => {
	return (
		<ModalProvider>
			<div className="w-full h-screen lg:p-5 p-3 flex items-center justify-center flex-col gap-3 min-h-0">
				<Container width="lg:w-1/2 w-full" height="100%" scroll>
					<div className="w-full h-full flex flex-col min-h-0">
						{/* TITLE */}
						<div className="flex items-center shrink-0 gap-3">
							<h2 className="Poppins-Bold lg:text-5xl text-2xl text-[#4a2f00]">
								What Bee Is This?
							</h2>
						</div>

						{/* CONTENT (camera, Next button, popups) */}
						<div className="w-full flex-1 min-h-0 flex flex-col pt-3 pb-3">
							{children}
						</div>
					</div>
				</Container>
			</div>
		</ModalProvider>
	);
};

export default GuestLayout;
