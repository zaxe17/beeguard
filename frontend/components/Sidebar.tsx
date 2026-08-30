"use client";

import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ProfilePhoto } from "./ProfilePhoto";

import bee from "../public/assets/bee.png";

// CITIZEN TABS
const citizenTabs = [
	{
		icon: "material-symbols:home",
		tabName: "home",
		route: "/citizen",
		exact: true,
	},
	{
		icon: "mdi:location-radius",
		tabName: "location",
		route: "/citizen/location",
		exact: false,
	},
	{
		icon: "solar:camera-bold",
		tabName: "report",
		route: "/citizen/report",
		exact: false,
	},
	{
		icon: "mdi:folder-open",
		tabName: "document",
		route: "/citizen/document",
		exact: false,
	},
	{
		icon: "iconamoon:profile-fill",
		tabName: "profile",
		route: "/",
		exact: false,
	},
];

const beekeeperTabs = [
	{
		icon: "mdi:view-dashboard",
		tabName: "dashboard",
		route: "/beekeeper",
		exact: true,
	},
	{
		icon: "ic:round-hive",
		tabName: "hives",
		route: "/beekeeper/hives",
		exact: false,
	},
	{
		icon: "mdi:alert",
		tabName: "alert",
		route: "/beekeeper/alert",
		exact: false,
	},
	{
		icon: "mdi:folder-open",
		tabName: "reports",
		route: "/beekeeper/report",
		exact: false,
	},
	{
		icon: "iconamoon:history-bold",
		tabName: "history",
		route: "/beekeeper/history",
		exact: false,
	},
	{
		icon: "iconamoon:profile-fill",
		tabName: "profile",
		route: "/",
		exact: false,
	},
];

const Sidebar = () => {
	const pathName = usePathname();

	const isBeekeeper = pathName.startsWith("/beekeeper");
	const isBeekeeperReport = pathName.startsWith("/beekeeper/report");
	const activeTab = isBeekeeper ? beekeeperTabs : citizenTabs;

	return (
		<nav className="bg-linear-to-b from-[#ffdb4f] to-[#d9a441] h-full shrink-0">
			{/* NAV HEADER */}
			<div className="px-3 pt-5 mb-10 flex items-center gap-2">
				<div className="w-10 h-10 rounded-full overflow-hidden">
					<Image
						src={bee}
						alt="user_profile"
						className="w-full h-full"
						priority
					/>
				</div>
				<span
					className="text-xl text-[#ffa004]"
					style={{
						fontFamily: "'Poppins-Bold', sans-serif",
					}}>
					BeeGuard
				</span>
			</div>

			{/* NAV TABS */}
			<ul className="flex flex-col gap-1">
				{activeTab.map((tab, i) => {
					const activeTab = tab.exact
						? pathName === tab.route
						: pathName === tab.route ||
							pathName.startsWith(`${tab.route}/`);

					return (
						<li key={i} className="group pl-3">
							<Link
								href={tab.route}
								className={`flex gap-2 items-center p-2.5 rounded-l-xl group-hover:bg-white transition-all duration-150 ease-in ${activeTab ? "bg-white" : ""}`}>
								<div className="w-8 h-8">
									{tab.tabName !== "profile" ? (
										<Icon
											icon={tab.icon}
											className={`w-full h-full mb-1 group-hover:text-[#ffc95f] transition-all duration-150 ease-in ${activeTab ? "text-[#ffc95f]" : "text-white"}`}
										/>
									) : (
										<ProfilePhoto />
									)}
								</div>

								<span
									className={`Poppins-Medium capitalize text-base group-hover:text-[#ffc95f] transition-all duration-150 ease-in ${activeTab ? "text-[#ffc95f]" : "text-white"}`}>
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
