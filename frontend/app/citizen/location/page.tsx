"use client";

import BeefarmView from "@/components/BeefarmView";
import { BeefarmContainer, Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/ui/Input";

// NEARBY FARM EXAMPLE DATA
import nearbyFarms from "@/data/beefarms.json";

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
		<div className="w-full h-full flex items-start">
			{/* CONTAINER FOR BEEFARM LOCATION TAB */}
			<Container width="30%" height="100%" borderNone>
				<div className="w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="Poppins-SemiBold text-xl text-[#020101]">
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

			<div className="flex-1 h-full">
				<div className="flex flex-col h-full">
					{/* LOCATION MAP */}
					{/* GAWING h-1/3 ITO TO SEE THE BEEFARM VIEW */}
					<div className="h-full">
						<Map />
					</div>

					{/* BEEFARM INFO */}
					<BeefarmView />
				</div>
			</div>
		</div>
	);
};

export default Location;
