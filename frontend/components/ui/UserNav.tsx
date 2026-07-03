import Image from "next/image";

import user_profile from "@/public/assets/user_profile.png";
import { Icon } from "@iconify/react";

export const UserNav = () => {
	return (
		<div className="pt-3 w-full flex items-center justify-between">
			<div className="flex items-center gap-3.5">
				{/* USER PROFILE */}
				<div className="border border-amber-100 w-16 h-16 rounded-full">
					<Image
						src={user_profile}
						alt="user_profile"
						className="w-full h-full"
					/>
				</div>

				{/* USER NAME */}
				<div className="">
					<h3 className="Poppins-Bold text-3xl">Hi, Jan Marc! 👋</h3>
					<span className="text-[#817b70] text-sm">
						Let’s protect the bees together.
					</span>
				</div>
			</div>

			{/* 3 ACTION BUTTON [SCAN, NOTIFICATION, MESSAGES] */}
			<div className="flex items-center gap-3">
				<Icon
					icon="mdi:qrcode-scan"
					className="w-10 h-10 text-[#ffdb4f] cursor-pointer"
				/>

				<div className="relative">
                    <span className="absolute right-0 bg-red-500 border-2 border-white w-4 h-4 rounded-full text-[8px] text-white flex justify-center items-center">4</span>
					<Icon
						icon="mdi:notifications"
						className="w-10 h-10 text-[#ffdb4f] cursor-pointer"
					/>
				</div>

				<Icon
					icon="flowbite:messages-solid"
					className="w-10 h-10 text-[#ffdb4f] cursor-pointer"
				/>
			</div>
		</div>
	);
};
