"use client";

import BeefarmView from "@/components/BeefarmView";
import { BeefarmContainer, Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/ui/Input";

// NEARBY FARM EXAMPLE DATA
import nearbyFarms from "@/data/beefarms.json";
import { Icon } from "@iconify/react";

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

const Location = () => {
	return (
		<div className="w-full h-full flex items-start lg:flex-row flex-col">
			{/* CONTAINER FOR BEEFARM LOCATION TAB */}
			<Container
				borderNone
				className="lg:w-[30%] w-full flex-1 lg:flex-none lg:h-full">
				<div className="relative w-full pt-5 px-2 flex flex-col items-center gap-4">
					{/* BACK ARROW */}
					<Icon
						icon="bx:arrow-back"
						className="absolute left-0 text-2xl text-[#ffa004]"
					/>

					<h3 className="relative Poppins-SemiBold text-xl text-[#020101]">
						Bee Farms
					</h3>

					<SearchBar placeholder="Search location" />
				</div>

				{/* SCROLLABLE BEEFARM CARD */}
				<div className="p-2 flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0">
					{nearbyFarms.map((nb, i) => (
						<div key={i}>
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

			<div className="flex-1 w-full lg:h-full">
				<div className="flex flex-col h-full">
					{/* LOCATION MAP */}
					<div className="flex-1">
						<Map />
					</div>

					{/* BEEFARM INFO */}
					<div className="flex-3 min-h-0 overflow-y-auto hidden">
						<BeefarmView />
					</div>
				</div>
			</div>
		</div>
	);
};

export default Location;
