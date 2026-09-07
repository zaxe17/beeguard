"use client";

import { useState } from "react";
import BeefarmView from "@/components/BeefarmView";
import { BeefarmContainer, Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/ui/Input";

// NEARBY FARM EXAMPLE DATA
import nearbyFarms from "@/data/beefarms.json";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import MobileOverlay from "@/components/MobileOverlay";

// Leaflet touches `window` at module-evaluation time, so it can't be
// server-rendered — same fix already applied in AlertModal.tsx and
// alert/details/page.tsx. This page previously did a static
// `import Map from "..."`, which forced Next to SSR it and crashed
// with "window is not defined" during build.
const Map = dynamic(() => import("@/components/ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

const BeefarmPage = () => {
	// Only matters on mobile — desktop always shows map + list side by side.
	const [mobileSelected, setMobileSelected] = useState(false);

	return (
		<div className="w-full h-full flex items-start lg:flex-row flex-col relative">
			{/* LEFT SIDE - CONTAINER FOR BEEFARM LOCATION TAB */}
			<Container
				borderNone
				className="lg:w-[30%] w-full flex-1 lg:flex-none lg:h-full">
				<div className="relative w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="relative Poppins-SemiBold text-xl text-[#020101]">
						Bee Farm
					</h3>

					<SearchBar placeholder="Search location" />
				</div>

				{/* SCROLLABLE BEEFARM CARD */}
				<div className="p-2 flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0">
					{nearbyFarms.map((nb, i) => (
						<div
							key={i}
							onClick={() => setMobileSelected(true)}
							className="cursor-pointer">
							<BeefarmContainer
								image={nb.image}
								farmName={nb.farmName}
								location={nb.location}
								miles={nb.miles}
							/>
						</div>
					))}
				</div>
			</Container>

			{/* RIGHT SIDE — desktop: always visible inline */}
			<div className="hidden lg:block flex-1 w-full lg:h-full">
				<div className="flex flex-col h-full">
					{/* LOCATION MAP */}
					<div className="flex-1">
						<Map />
					</div>

					{/* BEEFARM INFO */}
					<div className="flex-3 min-h-0 overflow-y-auto lg:hidden block">
						<BeefarmView />
					</div>
				</div>
			</div>

			{/* RIGHT SIDE — mobile: full-screen overlay, only after a farm is clicked */}
			<AnimatePresence>
				{mobileSelected && (
					<MobileOverlay>
						<div className="flex flex-col h-full">
							{/* BACK BUTTON */}
							<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6] shrink-0">
								<button
									onClick={() => setMobileSelected(false)}
									className="flex items-center shrink-0">
									<Icon
										icon="bx:arrow-back"
										className="text-2xl text-[#ffa004]"
									/>
								</button>
								<span className="w-full Poppins-SemiBold text-sm text-[#4a2f00] text-center">
									Bee Farm
								</span>
							</div>

							{/* MAP + BEEFARM INFO */}
							<div className="flex-1 min-h-0 flex flex-col">
								<div className="flex-1 min-h-0">
									<Map />
								</div>
								<div className="flex-3 min-h-0 overflow-y-auto">
									<BeefarmView />
								</div>
							</div>
						</div>
					</MobileOverlay>
				)}
			</AnimatePresence>
		</div>
	);
};

export default BeefarmPage;
