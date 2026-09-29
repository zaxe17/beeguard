// components/ReportDetails.tsx
"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { reportStatus, statusLabel, type ReportProps } from "./ui/ReportCard";
import { usePlaceName } from "@/hooks/usePlaceName";

import bee from "@/public/assets/bee_example.jpg";

// Leaflet needs `window` — the map loads in the browser only, after the
// rest of the report is already showing.
const Map = dynamic(() => import("./ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});


// `showMap` (default true): citizen and admin report popups show the
// location map; the beekeeper's popup passes showMap={false}.
type ReportDetailsProps = ReportProps & { showMap?: boolean };

const ReportDetails = ({
	status,
	reportId,
	specification,
	location,
	date,
	time,
	details,
	activity,
	danger,
	imageUrl,
	latitude,
	longitude,
	showMap = true,
}: ReportDetailsProps) => {
	// Reports store only coordinates — look the place name up for display.
	const placeName = usePlaceName(latitude, longitude);
	const shownLocation = location || placeName;
	// Pin of where the bees were reported (citizen, beekeeper and admin
	// report popups all use this component).
	const pin =
		latitude != null && longitude != null
			? { lat: Number(latitude), lng: Number(longitude) }
			: null;

	return (
		<div className="flex flex-col gap-4 w-full">
			{/* HIVES DETAILS */}
			<div
				className="border-2 border-[#e2e2e6] rounded-2xl p-2.5 capitalize flex lg:flex-row flex-col gap-5"
				style={{
					boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
				}}>
				{/* LEFT */}
				<div className="w-full h-full overflow-hidden">
					{imageUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={imageUrl}
							alt="Reported bees"
							className="w-full h-full max-h-80 object-cover rounded-md"
						/>
					) : (
						<Image
							src={bee}
							alt="hive_icon"
							className="w-full h-full object-cover rounded-md"
							priority
						/>
					)}
				</div>

				{/* RIGHT */}
				<div className="w-full">
					{/* REPORT ID */}
					<div className="flex justify-between items-start">
						<h2 className="Poppins-SemiBold text-lg text-[#545454]">
							Report ID
						</h2>
						<span
							className="Poppins-SemiBold text-xs text-center capitalize w-22 py-0.75 rounded-full"
							style={{
								color: reportStatus[status].color,
								backgroundColor: `${reportStatus[status].color}66`,
							}}>
							{statusLabel(status)}
						</span>
					</div>

					{/* REPORT ID */}
					<h3 className="Poppins-SemiBold text-2xl text-[#ffce1c]">
						#{reportId}
					</h3>

					{/* BEE NAME */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Bee Specification
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{specification}
					</p>

					{/* LOCATION */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Location
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{shownLocation}
					</p>

					{/* DATE AND TIME */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Date & Time
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{date} • {time}
					</p>

					{/* DETAILS */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Details
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{details}
					</p>

					{/* ACTIVITY AND DANGER */}
					<div className="flex gap-15 items-center mt-3">
						<div>
							<h2 className="Poppins-SemiBold leading-3.5 text-sm text-[#817b70]">
								Activity
							</h2>
							<p className="leading-4 text-[#4A2F00] font-medium">
								{activity}
							</p>
						</div>
						<div>
							<h2 className="Poppins-SemiBold leading-3.5 text-sm text-[#817b70]">
								Danger
							</h2>
							<p className="leading-4 text-[#4A2F00] font-medium">
								{danger}
							</p>
						</div>
					</div>

					{/* PAYMENT METHOD */}
					<h2 className="Poppins-SemiBold leading-2 mt-3 text-sm text-[#817b70]">
						Payment Method
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						Cash Upon Rescue
					</p>
				</div>
			</div>

			{/* LOCATION MAP — read-only pin of the reported swarm */}
			{showMap && pin && !Number.isNaN(pin.lat) && !Number.isNaN(pin.lng) && (
				<div className="flex flex-col gap-1">
					<div className="w-full h-56 rounded-xl overflow-hidden border border-[#e2e2e6] relative isolate">
						<Map
							key={`${pin.lat},${pin.lng}`}
							initialCenter={pin}
							markerPosition={pin}
							readOnly
						/>
					</div>
					<a
						href={`https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}`}
						target="_blank"
						rel="noopener noreferrer"
						className="self-end text-xs text-[#ff9a00] Poppins-SemiBold hover:underline">
						Get directions ↗
					</a>
				</div>
			)}

			{/* BUTTONS */}
			<div className="flex flex-col items-center justify-center gap-5"></div>
		</div>
	);
};

export default ReportDetails;