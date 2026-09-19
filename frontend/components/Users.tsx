"use client";

import { usePathname } from "next/navigation";
import { ProfilePhoto } from "./ProfilePhoto";
import { Button } from "./ui/Button";

type UserProp = {
	name?: string;
	role?: string;
	email?: string;
	phoneNo?: string;
	status: "active" | "inactive";
};

type ProfileDisplayProps = {
	name?: string;
	email?: string;
	onClick?: () => void;
};

export const Users = ({ name, role, email, phoneNo, status }: UserProp) => {
	const location = usePathname();
	const pathname = location === "/admin/profile/user";

	return (
		<div
			className={`w-full flex items-start gap-3 p-2 transition-all duration-150 ease-in rounded-xl ${pathname ? "" : "hover:bg-[#fff1ad]/40 hover:scale-101 hover:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]"} `}>
			{/* PROFILE */}
			<div className="lg:w-20 w-11 lg:h-20 h-11">
				<ProfilePhoto />
			</div>

			{/* NAME AND OFFER */}
			<div className="">
				<h3 className="Poppins-SemiBold lg:text-lg text-sm capitalize">
					{name}
				</h3>
				<p className="Poppins-SemiBold text-xs text-[#817b70] capitalize">
					{role}
				</p>
				<p className="text-xs text-[#a6a3a3]">{email}</p>
				<p className="text-xs text-[#a6a3a3]">{phoneNo}</p>
			</div>

			<div className="ml-auto pr-3">
				<span
					className={`rounded-full flex items-center justify-center capitalize py-1 px-3 lg:text-base text-[10px] ${status === "active" ? "bg-[#00cc00] text-white" : "bg-[#e2e2e6] text-[#817b70]"}`}>
					{status}
				</span>
			</div>
		</div>
	);
};

export const ProfileDisplay = ({
	name,
	email,
	onClick,
}: ProfileDisplayProps) => {
	const location = usePathname();
	const pathName = location === "/beekeeper/profile";

	return (
		<div className="w-full flex items-center gap-3 p-2 transition-all duration-150 ease-in rounded-xl">
			{/* PROFILE */}
			<div className="w-20 h-20">
				<ProfilePhoto />
			</div>

			{/* NAME AND EMAIL */}
			<div className="">
				<h3 className="Poppins-SemiBold text-xl capitalize">{name}</h3>
				<p className="text-xs text-[#817b70]">{email}</p>

				{/* FOR VERIFY BEEKEEPER BUTTON */}
				<div className={`mt-3 ${pathName ? "block" : "hidden"}`}>
					<Button
						onClick={onClick}
						width="70%"
						textSize="text-xs"
						label="Verify Account"
					/>
				</div>
			</div>
		</div>
	);
};
