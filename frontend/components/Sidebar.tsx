"use client";

import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import user_profile from "../public/assets/user_profile.png";

// CITIZEN TABS
const citizenTabs = [
	{
		icon: "material-symbols:home",
		tabName: "home",
		route: "/citizen",
	},
	{
		icon: "mdi:location-radius",
		tabName: "location",
		route: "/citizen/location",
	},
	{
		icon: "solar:camera-bold",
		tabName: "report",
		route: "/",
	},
	{
		icon: "mdi:folder-open",
		tabName: "document",
		route: "/",
	},
	{
		icon: "iconamoon:profile-fill",
		tabName: "profile",
		route: "/",
	},
];

const beekeeperTabs = [
	{
		icon: "mdi:view-dashboard",
		tabName: "dashboard",
		route: "/beekeeper",
	},
	{
		icon: "ic:round-hive",
		tabName: "hives",
		route: "/beekeeper/hives",
	},
	{
		icon: "mdi:alert",
		tabName: "alert",
		route: "/beekeeper/alert",
	},
	{
		icon: "mdi:folder-open",
		tabName: "reports",
		route: "/",
	},
	{
		icon: "iconamoon:profile-fill",
		tabName: "profile",
		route: "/",
	},
];

const Sidebar = () => {
	const pathName = usePathname();

	const isBeekeeper = pathName.startsWith("/beekeeper");
	const activeTab = isBeekeeper ? beekeeperTabs : citizenTabs;

	return (
		<nav className="bg-[#ffdb4f] h-full shrink-0">
			{/* NAV HEADER */}
			<div className="px-3 pt-5 mb-10 flex items-center gap-2">
				<div className="border border-amber-100 w-13 h-13 rounded-full overflow-hidden">
					<Image
						src={user_profile}
						alt="user_profile"
						className="w-full h-full"
						priority
					/>
				</div>
				<span
					className="text-[26px] text-[#ffa004]"
					style={{
						fontFamily: "'Poppins-Bold', sans-serif",
					}}>
					BeeGuard
				</span>
			</div>

			{/* NAV TABS */}
			<ul className="flex flex-col gap-1">
				{activeTab.map((tab, i) => {
					const activeTab = pathName === tab.route;

					return (
						<li key={i} className="group pl-5">
							<Link
								href={tab.route}
								className={`flex items-center gap-2 p-2.5 rounded-l-xl group-hover:bg-white transition-all duration-100 ease-in ${activeTab ? "bg-white" : ""}`}>
								<Icon
									icon={tab.icon}
									className={`w-8 h-8 mb-1 group-hover:text-[#ffc95f] transition-all duration-100 ease-in ${activeTab ? "text-[#ffc95f]" : "text-white"}`}
								/>
								<span
									className={`capitalize text-xl group-hover:text-[#ffc95f] transition-all duration-100 ease-in ${activeTab ? "text-[#ffc95f]" : "text-white"}`}>
									{tab.tabName}
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
};

export default Sidebar;
