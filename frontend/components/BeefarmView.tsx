import Image from "next/image";

import { VerifyStatus } from "./ui/VerifyStatus";
import { Button } from "./ui/Button";
import { ProfilePhoto } from "./ProfilePhoto";

import beefarm from "../public/assets/farms/farm1.jpg";
import { RateCard } from "./ui/Card";
import { Icon } from "@iconify/react";

const BeefarmView = () => {
	return (
		<div className="w-full flex-1 overflow-scroll">
			<div className="relative w-full h-60">
				{/* COVER PHOTO */}
				<Image
					src={beefarm}
					alt="cover_photo"
					fill
					className="object-cover"
					priority
				/>

				{/* PROFILE PICTURE */}
				<div className="absolute left-4 -bottom-15 w-30 h-30 rounded-full overflow-hidden border-4 border-white shadow-md">
					<ProfilePhoto />
				</div>
			</div>

			<div className="flex justify-between gap-3 px-4 pt-2">
				{/* LEFT SIDE */}
				<div className="w-full">
					{/* NAME, VERIFY STATUS */}
					<div className="flex justify-between items-start w-full pl-33">
						{/* DISPLAY NAME AND VERIFY STATUS */}
						<div className="flex flex-col">
							<span className="Poppins-SemiBold text-black text-2xl">
								Jan Marc Jacolbia
							</span>

							<VerifyStatus />
						</div>
					</div>

					{/* STAR RATE */}
					<div className="flex items-center mt-2">
						<div className="w-6 h-6">
							<Icon
								icon="material-symbols:star-rounded"
								className="w-full h-full text-[#fbca42]"
							/>
						</div>
						<div className="w-6 h-6">
							<Icon
								icon="material-symbols:star-rounded"
								className="w-full h-full text-[#fbca42]"
							/>
						</div>
						<div className="w-6 h-6">
							<Icon
								icon="material-symbols:star-rounded"
								className="w-full h-full text-[#fbca42]"
							/>
						</div>
						<div className="w-6 h-6">
							<Icon
								icon="material-symbols:star-rounded"
								className="w-full h-full text-[#fbca42]"
							/>
						</div>
						<div className="w-6 h-6">
							<Icon
								icon="material-symbols:star-outline-rounded"
								className="w-full h-full text-[#fbca42]"
							/>
						</div>

						<span className="pl-3 text-base text-[#a6a3a3]">
							4.0 (147 reviews)
						</span>
					</div>

					{/* STATUS RATES */}
					<div className="w-full flex gap-3 mt-3">
						<RateCard total="120" title="Successful Rescue" />
						<RateCard total="57" title="Hives" />
						<RateCard total="5.0" title="Ratings" />
					</div>
				</div>

				{/* RIGHT SIDE */}
				<div className="w-1/3">
					{/* BUTTONS */}
					<div className="flex gap-2 mt-3">
						<Button
							width="150px"
							buttonType="button"
							label="Message"
                            bgNone
						/>
						<Button
							width="150px"
							buttonType="button"
							label="Follow"
						/>
					</div>

					{/* ABOUT */}
					<div className="flex flex-col mt-3 pl-2">
						<h3 className="Poppins-SemiBold text-sm">About</h3>
						<p className="text-xs">
							We are local bee farm committed to producing pure
							and natural honey product.
						</p>
					</div>

					{/* LOCATION */}
					<div className="flex flex-col mt-3 pl-2">
						<h3 className="Poppins-SemiBold text-sm">Location</h3>
						<p className="text-xs">Quezon City, Metro Manila</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BeefarmView;
