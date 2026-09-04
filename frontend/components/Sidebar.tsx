"use client";

import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
		<nav className="fixed bottom-0 left-0 right-0 z-50 lg:sticky lg:top-0 lg:left-auto lg:right-auto bg-linear-to-b from-[#ffdb4f] to-[#d9a441] lg:h-full shrink-0">
			{/* NAV HEADER */}
			<div className="px-3 pt-5 mb-10 lg:flex items-center gap-2 hidden">
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
			<ul className="flex lg:flex-col flex-row lg:gap-1 gap-0 justify-evenly">
				{activeTab.map((tab, i) => {
					const activeTab = tab.exact
						? pathName === tab.route
						: pathName === tab.route ||
							pathName.startsWith(`${tab.route}/`);

					return (
						<li key={i} className="group lg:pl-3 lg:p-0 p-1.25">
							<Link
								href={tab.route}
								className={`flex lg:flex-row flex-col lg:gap-2 gap-1 items-center lg:p-2.5 p-0 lg:rounded-l-xl lg:rounded-none rounded-full group-hover:bg-white transition-all duration-150 ease-in ${activeTab ? "lg:bg-white" : ""}`}>
								{/* ===== DESKTOP ICON (walang galaw, dati na) ===== */}
								<div className="w-8 h-8 hidden lg:block">
									{tab.tabName !== "profile" ? (
										<Icon
											icon={tab.icon}
											className={`w-full h-full mb-1 group-hover:text-[#ffc95f] transition-all duration-150 ease-in ${activeTab ? "text-[#ffc95f]" : "text-white"}`}
										/>
									) : (
										<ProfilePhoto />
									)}
								</div>

								{/* ===== MOBILE ICON (may blob + lift animation) ===== */}
								<div className="w-8 h-8 relative flex items-center justify-center lg:hidden lg:mb-0 mb-4">
									{tab.tabName !== "profile" && (
										<motion.div
											className="absolute rounded-full bg-[#ffc95f] -z-10 p-6"
											style={{ width: 40, height: 40 }}
											initial={false}
											animate={{
												scale: activeTab ? 1 : 0,
												y: activeTab ? -10 : 0,
											}}
											transition={{
												type: "spring",
												stiffness: 350,
												damping: 25,
											}}
										/>
									)}

									{tab.tabName !== "profile" ? (
										<motion.div
											className="w-full h-full"
											animate={{ y: activeTab ? -10 : 0 }}
											transition={{
												type: "spring",
												stiffness: 350,
												damping: 25,
											}}>
											<Icon
												icon={tab.icon}
												className={`w-full h-full mb-1 transition-all duration-150 ease-in ${activeTab ? "text-white" : "text-white"}`}
											/>
										</motion.div>
									) : (
										<ProfilePhoto />
									)}
								</div>

								<span
									className={`lg:block hidden Poppins-Medium capitalize lg:text-base text-sm group-hover:text-[#ffc95f] transition-all duration-150 ease-in ${activeTab ? "text-[#ffc95f]" : "text-white"}`}>
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
