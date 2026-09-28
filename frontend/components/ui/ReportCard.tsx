"use client";

import Image from "next/image";

import bee from "@/public/assets/bee_example.jpg";
import { usePlaceName } from "@/hooks/usePlaceName";

export type ReportProps = {
	status: "pending" | "in-progress" | "resolved" | "rejected" | "cancelled";
	reportId?: string;
	beeName?: string;
	specification?: string;
	location?: string;
	date?: string;
	time?: string;
	details?: string;
	activity?: string;
	danger?: string;
	onClick?: () => void;
	// NEW — real report data. When latitude/longitude are given and
	// `location` isn't, the place name is looked up from them.
	imageUrl?: string;
	latitude?: number | null;
	longitude?: number | null;
	selected?: boolean;
};

export const reportStatus = {
	pending: {
		color: "#ffdb4f",
	},
	"in-progress": {
		color: "#ff9a00",
	},
	resolved: {
		color: "#1f6f5f",
	},
	rejected: {
		color: "#ff0000",
	},
	// Migration 011 — citizen cancelled the report.
	cancelled: {
		color: "#817b70",
	},
};

export const statusLabel = (status: ReportProps["status"]) =>
	status === "in-progress" ? "In Progress" : status;

export const ReportCard = ({
	status,
	onClick,
	reportId,
	location,
	date,
	time,
	imageUrl,
	latitude,
	longitude,
	selected,
}: ReportProps) => {
	const placeName = usePlaceName(latitude, longitude);

	// Fallbacks keep any older static usage looking the same as before.
	const shownId = reportId ?? "BG-2026-001";
	const shownLocation = location || placeName || "Payatas, Quezon City";
	const shownWhen = date ? `${date}${time ? ` • ${time}` : ""}` : "March 29, 2026 • 9:41 am";

	return (
		<div
			onClick={onClick}
			className={`transition-all duration-130 ease-in hover:border-[#e2e2e6] hover:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] hover:bg-[#fff1ad]/40 hover:scale-101 rounded-xl p-1.75 flex items-center gap-3 w-full ${selected ? "lg:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] lg:bg-[#fff1ad]/40" : ""}`}>
			{/* BEE PICTURE */}
			<div className="border border-amber-100 w-30 h-20 shrink-0 rounded-md overflow-hidden">
				{imageUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={imageUrl}
						alt="bee"
						loading="lazy"
						className="w-full h-full object-cover"
					/>
				) : (
					<Image
						src={bee}
						alt="bee"
						width={100}
						className="w-full h-full object-cover"
						priority
					/>
				)}
			</div>

			{/* CONTAINER FOR INFO */}
			<div className="w-full h-full flex flex-col min-w-0">
				<div className="flex lg:flex-row flex-col justify-between items-start lg:gap-2 gap-0">
					<h3 className="Poppins-Bold lg:text-xl text-base">
						#{shownId}
					</h3>
					<span
						className="Poppins-SemiBold lg:text-xs text-[10px] text-center capitalize w-22 shrink-0 py-0.75 rounded-full"
						style={{
							color: reportStatus[status].color,
							backgroundColor: `${reportStatus[status].color}66`,
						}}>
						{statusLabel(status)}
					</span>
				</div>
				<span className="Poppins-SemiBold text-sm line-clamp-1">
					{shownLocation}
				</span>
				<span className="Poppins-SemiBold text-xs text-[#a6a3a3]">
					{shownWhen}
				</span>
			</div>
		</div>
	);
};