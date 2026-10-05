"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { AnimatePresence } from "framer-motion";

import BeefarmView from "@/components/BeefarmView";
import MobileOverlay from "@/components/MobileOverlay";
import { BeefarmContainer, Container } from "@/components/ui/Container";
import { SearchBar } from "@/components/ui/Input";
import { BeefarmSkeleton } from "@/components/loading/SkeletonLoading";
import type { FarmMarker } from "@/components/ui/google-maps/Map";
import { useQueryParamState } from "@/hooks/useQueryParamState";
import { api } from "@/services/api";
import { mediaSrc } from "@/services/profile";
import { getCitizenCoords } from "@/utils/geo";

// Leaflet needs `window`, so the map is client-side only.
const Map = dynamic(() => import("@/components/ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

const FARM_PARAM = "farm";

// Shape returned by GET /api/farms
type Farm = {
	beekeeperID: string;
	farmName: string;
	location: string;
	miles: number | null;
	image: string | null;
	rating_avg: number;
	rating_count: number;
	apiary_type: string | null;
	latitude: number | null;
	longitude: number | null;
};

const BeefarmPage = () => {
	const router = useRouter();
	const pathname = usePathname();

	// The selected farm lives in the URL (?farm=<beekeeperID>).
	const {
		value: selectedFarmParam,
		setValue: openFarmParam,
		clearValue: closeFarmParam,
	} = useQueryParamState(FARM_PARAM);

	const mobileSelected = selectedFarmParam !== null;

	const [farms, setFarms] = useState<Farm[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	useEffect(() => {
		let cancelled = false;

		const loadFarms = async () => {
			setLoading(true);

			const coords = await getCitizenCoords();
			if (cancelled) return;

			const params = new URLSearchParams();
			if (search) params.set("search", search);
			if (coords) {
				params.set("lat", String(coords.lat));
				params.set("lng", String(coords.lng));
			}

			const qs = params.toString();
			const res = await api.get<Farm[]>(`/farms${qs ? `?${qs}` : ""}`);
			if (cancelled) return;

			if (res.success && res.data) setFarms(res.data);
			setLoading(false);
		};

		const timer = setTimeout(loadFarms, search ? 300 : 0);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [search]);

	// Only farms with a pinned location get a marker.
	const farmMarkers: FarmMarker[] = farms
		.filter((f) => f.latitude != null && f.longitude != null)
		.map((f) => ({
			id: f.beekeeperID,
			lat: f.latitude as number,
			lng: f.longitude as number,
			label: f.farmName,
		}));

	const handleBack = () => {
		router.replace(pathname);
	};

	return (
		<div className="w-full h-full flex items-start lg:flex-row flex-col relative">
			{/* LEFT — farm list */}
			<Container
				borderNone
				className="lg:w-[30%] w-full flex-1 lg:flex-none lg:h-full">
				<div className="relative w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="relative Poppins-SemiBold text-xl text-[#020101]">
						Bee Farm
					</h3>

					<SearchBar
						placeholder="Search beefarm"
						value={search}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearch(e.target.value)
						}
					/>
				</div>

				<div className="p-2 flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					{loading &&
						Array.from({ length: 5 }).map((_, i) => (
							<BeefarmSkeleton key={i} />
						))}

					{!loading && farms.length === 0 && (
						<div className="text-center text-sm text-[#a6a3a3] py-4">
							No farms found.
						</div>
					)}

					{!loading &&
						farms.map((farm) => (
							<div
								key={farm.beekeeperID}
								onClick={() => openFarmParam(farm.beekeeperID)}
								className={
									farm.beekeeperID === selectedFarmParam
										? "cursor-pointer bg-[#fff1ad]/40 rounded-xl"
										: "cursor-pointer"
								}>
								<BeefarmContainer
									image={
										mediaSrc(farm.image) ??
										"/assets/farms/farm1.jpg"
									}
									farmName={farm.farmName}
									location={farm.location}
									miles={farm.miles ?? undefined}
								/>
							</div>
						))}
				</div>
			</Container>

			{/* RIGHT — desktop: map + farm profile */}
			<div className="hidden lg:block flex-1 w-full lg:h-full">
				<div className="flex flex-col h-full">
					<div className="relative flex-1 min-h-[35%] isolate">
						<Map
							markers={farmMarkers}
							selectedMarkerId={selectedFarmParam}
							onMarkerClick={(id) => openFarmParam(id)}
						/>

						{selectedFarmParam ? (
							<button
								type="button"
								onClick={closeFarmParam}
								className="absolute top-3 right-3 z-1000 flex items-center gap-1.5 bg-white/95 hover:bg-white text-[#4a2f00] text-xs Poppins-SemiBold py-1.5 px-3 rounded-full shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] transition-all duration-150 ease-in">
								<Icon
									icon="mdi:arrow-expand"
									className="w-4 h-4"
								/>
								Show full map
							</button>
						) : (
							farmMarkers.length > 0 && (
								<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-1000 bg-white/95 text-[#4a2f00] text-xs Poppins-SemiBold py-1.5 px-4 rounded-full shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] pointer-events-none">
									Tap a pin or a farm to see its profile
								</div>
							)
						)}
					</div>

					<div
						className={`shrink-0 bg-white overflow-y-auto lg:scrollbar-auto scrollbar-none transition-[max-height] duration-300 ease-in-out ${
							selectedFarmParam ? "max-h-[65%]" : "max-h-0"
						}`}>
						{selectedFarmParam && (
							<BeefarmView farmId={selectedFarmParam} />
						)}
					</div>
				</div>
			</div>

			{/* RIGHT — mobile: overlay after a farm is selected */}
			<AnimatePresence>
				{mobileSelected && (
					<MobileOverlay>
						<div className="flex flex-col h-full">
							<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6] shrink-0">
								<button
									type="button"
									onClick={handleBack}
									aria-label="Back"
									className="absolute left-2 z-10 flex items-center justify-center w-10 h-10 shrink-0">
									<Icon
										icon="bx:arrow-back"
										className="text-2xl text-[#ffa004]"
									/>
								</button>
								<span className="w-full Poppins-SemiBold text-sm text-[#4a2f00] text-center">
									Bee Farm
								</span>
							</div>

							<div className="flex-1 min-h-0 flex flex-col">
								<div className="flex-1 min-h-0">
									<Map
										markers={farmMarkers}
										selectedMarkerId={selectedFarmParam}
										onMarkerClick={(id) =>
											openFarmParam(id)
										}
									/>
								</div>

								<div className="flex-3 min-h-0 overflow-y-auto lg:scrollbar-auto scrollbar-none">
									{selectedFarmParam && (
										<BeefarmView
											farmId={selectedFarmParam}
										/>
									)}
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
