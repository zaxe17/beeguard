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
			className="p-1.5 flex flex-col rounded-2xl hover:bg-[#fff1ad]/60 transition-all duration-100 ease-in hover:scale-102"
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

export const BeefarmOperation = ({
	image,
	farmName,
	location,
	miles,
}: BeeFarmProps) => {
	return (
		<div
			className="p-2 flex flex-col rounded-2xl hover:bg-[#fff1ad]/60 transition-all duration-100 ease-in hover:scale-102"
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
						<div className="flex justify-between items-center">
							<h3 className="Poppins-Bold text-lg line-clamp-2">
								{location}
							</h3>

                            {/* PROGRESS STATUS */}
                            <span className="bg-[#4abd3e]/40 text-[#1f6f5f] text-xs py-1 px-3 rounded-md">In Progress</span>
						</div>

						<p className="text-xs text-[#817b70] font-bold line-clamp-2">
							{miles} km
						</p>
					</div>

					<span className="Poppins-SemiBold text-sm text-[#817b70] font-bold text-end">
						Offer: <span className="text-[#ff9a00]">₱5,000</span>
					</span>
				</div>
			</div>
		</div>
	);
};
