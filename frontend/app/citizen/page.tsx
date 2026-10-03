"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
	BeefarmContainer,
	Container,
} from "@/components/ui/Container";
import { UserNav } from "@/components/UserNav";
import { api } from "@/services/api";
import { mediaSrc } from "@/services/profile";

import bee_report from "@/public/assets/bee_report.png";
import { BeefarmSkeleton } from "@/components/loading/SkeletonLoading";
import { getCitizenCoords } from "@/utils/geo";

// Shape returned by GET /api/farms — see services/farm_service.py
// (same type as app/citizen/beefarm/page.tsx).
type Farm = {
	beekeeperID: string;
	farmName: string;
	location: string;
	miles: number | null; // actually km — distance from the citizen, if known
	image: string | null;
	latitude: number | null;
	longitude: number | null;
};

// How many farms the Home page shows ("View All" opens the full list).
const HOME_FARM_LIMIT = 9;

const Home = () => {
	const router = useRouter();

	const [farms, setFarms] = useState<Farm[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// ── Nearby farms from the database ──────────────
	// With the citizen's location, the backend sorts farms nearest-first
	// and fills in the distance; without it, farms still show (newest first).
	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			const coords = await getCitizenCoords();
			const query = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
			const res = await api.get<Farm[]>(`/farms${query}`);
			if (cancelled) return;
			if (res.success && res.data) {
				setFarms(res.data);
				setErrorMsg(null);
			} else {
				setErrorMsg(res.message || "Couldn't load nearby farms.");
			}
			setLoading(false);
		};

		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const shownFarms = farms.slice(0, HOME_FARM_LIMIT);

	return (
		<div className="w-full h-full lg:p-5 p-0 flex items-start flex-col gap-3">
			{/* USER NAVIGAATION BAAR */}
			<UserNav />

			{/* CONTAINER */}
			<Container width="100%" height="100%" scroll>
				<div className="w-full p-5 rounded-xl bg-linear-to-br from-[#ffdb4f] to-[#f8f4e1] flex flex-col gap-4">
					<div className="text-center">
						<h3 className="Poppins-SemiBold text-[26px]">
							Spotted a Swarm?
						</h3>
						<span className="text-[#545454] text-sm">
							Help protect bees in your area
						</span>
					</div>

					<div className="w-full flex justify-center items-center">
						<div className="lg:h-48 h-30 flex justify-center items-center">
							<Image
								src={bee_report}
								alt="bee_report"
								className="w-full h-full"
							/>
						</div>
					</div>

					<div className="flex justify-center">
						<Button
							label="Report Now!"
							buttonType="button"
							width="40%"
							onClick={() => router.push("/citizen/report")}
						/>
					</div>
				</div>

				<div className="w-full flex flex-col items-start">
					<span className="w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
						Nearby Bee Farms
						<span
							className={`text-base text-[#ffce1c] cursor-pointer ${farms.length > 0 ? "block" : "hidden"}`}
							onClick={() => router.push("/citizen/beefarm")}>
							view all
						</span>
					</span>

					{!loading && errorMsg && (
						<p className="w-full text-center text-sm text-red-600 py-4">
							{errorMsg}
						</p>
					)}
					{!loading && !errorMsg && shownFarms.length === 0 && (
						<p className="w-full text-center text-sm text-[#a6a3a3] py-4">
							No bee farms registered yet.
						</p>
					)}

					<div className="w-full grid lg:grid-cols-3 grid-cols-1 gap-3">
						{loading
							? Array.from({ length: 3 }).map((_, i) => (
									<BeefarmSkeleton key={i} />
								))
							: shownFarms.map((farm) => (
									<div
										key={farm.beekeeperID}
										onClick={() =>
											router.push(
												`/citizen/beefarm?farm=${farm.beekeeperID}`,
											)
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
				</div>
			</Container>
		</div>
	);
};

export default Home;
