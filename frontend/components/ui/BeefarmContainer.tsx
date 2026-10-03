import Image, { StaticImageData } from "next/image";

export type BeeFarmProps = {
	image: string | StaticImageData;
	farmName?: string;
	location?: string;
	miles?: number;
};

export const BeefarmNearby = ({
	image,
	farmName,
	location,
	miles,
}: BeeFarmProps) => {
	return (
		<div
			className="p-1.5 flex flex-col rounded-2xl hover:bg-[#fff1ad]/60 transition-all duration-150 ease-in hover:scale-101"
			style={{
				boxShadow:
					"rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
			}}>
			<div className="w-full flex gap-3 cursor-pointer">
				{/* BEEFARM PICTURE */}
				<div className="bg-red-600 border border-amber-100 w-20 aspect-square rounded-lg overflow-hidden shrink-0 self-start">
					<Image
						src={image}
						alt="nearby_beekeeper"
						width={100}
						height={100}
						className="w-full h-full object-cover"
						priority
					/>
				</div>

				{/* BEEFARM NAME & LOCATION */}
				<div className="w-full flex-1 flex flex-col justify-between">
					<div>
						<h3 className="Poppins-Bold text-lg line-clamp-2">
							{farmName}
						</h3>
						<p className="text-xs text-[#817b70] font-bold line-clamp-2">
							{location}
						</p>
					</div>

					<span className="text-xs text-[#817b70] font-bold text-end">
						{miles} km
					</span>
				</div>
			</div>
		</div>
	);
};

// A rescue job on the beekeeper dashboard's "Operations" panel.
// All props optional so older static usage still renders.
export type OperationProps = {
	image?: string | StaticImageData;
	location?: string; // place name (or coordinates) of the report
	distanceKm?: number | null;
	status?: "in-progress" | "offer-sent" | "new" | "declined";
	offeredFee?: number | null;
	onClick?: () => void;
};

const OPERATION_STATUS = {
	"in-progress": {
		label: "In Progress",
		className: "bg-[#4abd3e]/40 text-[#1f6f5f]",
	},
	"offer-sent": {
		label: "Offer Sent",
		className: "bg-[#ffdb4f]/50 text-[#4a2f00]",
	},
	// The citizen declined my offer; the report is still open.
	declined: {
		label: "Offer Declined",
		className: "bg-red-600/15 text-red-600",
	},
	// A nearby report no beekeeper has taken yet — tap to make an offer.
	new: {
		label: "New Report",
		className: "bg-[#38b6ff]/25 text-[#0b5c8a]",
	},
};

export const BeefarmOperation = ({
	image,
	location,
	distanceKm,
	status = "in-progress",
	offeredFee,
	onClick,
}: OperationProps) => {
	const badge = OPERATION_STATUS[status];
	// Report photos come from the Flask server (full http URL) — a plain
	// <img> avoids needing next.config image domains for them.
	const isRemote = typeof image === "string" && /^https?:\/\//.test(image);

	return (
		<div
			onClick={onClick}
			className="p-2 flex flex-col rounded-2xl transition-all duration-150 ease-in hover:bg-[#fff1ad]/60 hover:scale-101 hover:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]">
			<div className="w-full flex gap-3 cursor-pointer">
				{/* REPORT PICTURE */}
				<div className="bg-[#f3eed8] border border-amber-100 w-20 aspect-square rounded-lg overflow-hidden shrink-0 self-start">
					{image &&
						(isRemote ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={image as string}
								alt="reported_bees"
								loading="lazy"
								className="w-full h-full object-cover"
							/>
						) : (
							<Image
								src={image}
								alt="reported_bees"
								width={100}
								height={100}
								className="w-full h-full object-cover"
								priority
							/>
						))}
				</div>

				{/* LOCATION, DISTANCE, OFFER */}
				<div className="w-full min-w-0 flex-1 flex flex-col justify-between">
					<div>
						<div className="flex justify-between items-center gap-2">
							<h3 className="Poppins-Bold text-lg line-clamp-1">
								{location}
							</h3>

							{/* PROGRESS STATUS */}
							<span
								className={`${badge.className} text-xs py-1 px-3 rounded-md text-nowrap`}>
								{badge.label}
							</span>
						</div>

						{distanceKm != null && (
							<p className="text-xs text-[#817b70] font-bold line-clamp-2">
								{distanceKm} km away
							</p>
						)}
					</div>

					{offeredFee != null && (
						<span className="Poppins-SemiBold text-sm text-[#817b70] font-bold text-end">
							Offer:{" "}
							<span className="text-[#ff9a00]">
								{offeredFee > 0
									? `₱${offeredFee.toLocaleString()}`
									: "Free rescue"}
							</span>
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
