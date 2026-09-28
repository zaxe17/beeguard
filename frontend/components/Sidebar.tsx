"use client";

import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ProfilePhoto } from "./ProfilePhoto";
import { useAuth } from "@/context/AuthContext";

import bee from "../public/assets/bee.png";

// Shared shape for every sidebar tab, so `verifiedOnly` is always
// `boolean | undefined` (never `unknown`) no matter which list is active.
type SidebarTab = {
	icon: string;
	tabName: string;
	route: string;
	exact: boolean;
	verifiedOnly?: boolean;
};

// CITIZEN TABS
const citizenTabs: SidebarTab[] = [
	{
		icon: "material-symbols:home",
		tabName: "home",
		route: "/citizen",
		exact: true,
	},
	{
		icon: "lucide-lab:bee-hive",
		tabName: "bee farm",
		route: "/citizen/beefarm",
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
		route: "/citizen/profile",
		exact: false,
	},
];

const beekeeperTabs: SidebarTab[] = [
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
		tabName: "report",
		route: "/beekeeper/report",
		exact: false,
		// This tab needs the beekeeper's account to be verified first.
		verifiedOnly: true,
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
		route: "/beekeeper/profile",
		exact: false,
	},
];

const adminTabs: SidebarTab[] = [
	{
		icon: "mdi:view-dashboard",
		tabName: "dashboard",
		route: "/admin",
		exact: true,
	},
	{
		icon: "iconamoon:profile-fill",
		tabName: "profile",
		route: "/admin/profile",
		exact: false,
	},
	{
		icon: "mdi:folder-open",
		tabName: "report",
		route: "/admin/report",
		exact: false,
	},
	{
		icon: "mdi:alert",
		tabName: "alert",
		route: "/admin/alert",
		exact: false,
	},
	{
		icon: "ic:round-hive",
		tabName: "more",
		route: "/admin/more",
		exact: false,
	},
];

const Sidebar = () => {
	const pathName = usePathname();
	const { user } = useAuth();

	const isBeekeeper = pathName.startsWith("/beekeeper");
	const isAdmin = pathName.startsWith("/admin");
	const activeTab = isBeekeeper
		? beekeeperTabs
		: isAdmin
			? adminTabs
			: citizenTabs;

	const isVerifiedBeekeeper =
		user?.role === "beekeeper" && user?.verification_status === "Verified";

	return (
		<nav className="lg:w-fit w-full lg:sticky lg:top-0 bg-linear-to-b from-[#ffdb4f] to-[#d9a441] lg:h-full shrink-0 z-9999">
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

					// Always a boolean now, so `{locked && ...}` is a valid ReactNode.
					const locked = !!tab.verifiedOnly && !isVerifiedBeekeeper;

					const tabInner = (
						<>
							{/* ===== DESKTOP ICON (walang galaw, dati na) ===== */}
							<div className="w-7 h-7 hidden lg:block relative">
								{isAdmin || tab.tabName !== "profile" ? (
									<Icon
										icon={tab.icon}
										className={`w-full h-full mb-1 transition-all duration-130 ease-in ${
											locked
												? "text-white/50"
												: `group-hover:text-[#ffc95f] ${activeTab ? "text-[#ffc95f]" : "text-white"}`
										}`}
									/>
								) : (
									<ProfilePhoto me />
								)}
								{locked && (
									<Icon
										icon="mdi:lock"
										className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-white bg-[#a6a3a3] rounded-full p-0.5"
									/>
								)}
							</div>

							{/* ===== MOBILE ICON (may blob + lift animation) ===== */}
							<div className="w-8 h-8 relative flex items-center justify-center lg:hidden lg:mb-0 mb-4">
								{(isAdmin || tab.tabName !== "profile") && (
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

								{isAdmin || tab.tabName !== "profile" ? (
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
											className={`w-full h-full mb-1 transition-all duration-130 ease-in ${
												locked ? "text-white/50" : "text-white"
											}`}
										/>
									</motion.div>
								) : (
									<ProfilePhoto me />
								)}
								{locked && (
									<Icon
										icon="mdi:lock"
										className="absolute bottom-0 right-0 w-3 h-3 text-white bg-[#a6a3a3] rounded-full p-0.5"
									/>
								)}
							</div>

							<span
								className={`lg:block hidden Poppins-Medium capitalize lg:text-base text-sm transition-all duration-130 ease-in ${
									locked
										? "text-white/50"
										: `group-hover:text-[#ffc95f] ${activeTab ? "text-[#ffc95f]" : "text-white"}`
								}`}>
								{tab.tabName}
							</span>
						</>
					);

					return (
						<li key={i} className="group lg:pl-3 lg:p-0 p-1.25">
							{locked ? (
								<div
									title="Verify your account first to unlock this."
									className="flex lg:flex-row flex-col lg:gap-2 gap-1 items-center lg:p-2.5 p-0 lg:rounded-l-xl lg:rounded-none rounded-full cursor-not-allowed">
									{tabInner}
								</div>
							) : (
								<Link
									href={tab.route}
									className={`flex lg:flex-row flex-col lg:gap-2 gap-1 items-center lg:p-2.5 p-0 lg:rounded-l-xl lg:rounded-none rounded-full group-hover:bg-white transition-all duration-130 ease-in ${activeTab ? "lg:bg-white" : ""}`}>
									{tabInner}
								</Link>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
};

export default Sidebar;