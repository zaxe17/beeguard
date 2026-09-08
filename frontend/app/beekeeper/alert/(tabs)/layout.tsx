"use client";

import { SearchBar } from "@/components/ui/Input";
import { useModal } from "@/context/ModalContext";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const tabs = [
	{
		label: "All",
		route: "/beekeeper/alert",
	},
	{
		label: "Today",
		route: "/beekeeper/alert/today",
	},
];

type ModalType = "addAlert";

const layout = ({ children }: { children: React.ReactNode }) => {
	const pathName = usePathname();
	const { openModal } = useModal<ModalType>();

	return (
		<div className="h-screen w-full flex justify-center items-center overflow-hidden">
			<div className="h-full lg:w-1/2 w-full flex flex-col pt-10 pb-3 min-h-0">
				<div className="flex justify-end items-center gap-3 mb-8 shrink-0">
					{/* ADD BUTTON */}
					<div
						onClick={() => openModal("addAlert")}
						className="w-8 h-8 bg-[#ffdb4f] rounded-full cursor-pointer">
						<Icon
							icon="tdesign:add"
							className="w-full h-full text-white"
						/>
					</div>

					{/* SEARCHBAR ALERTS */}
					<div className="lg:w-1/3 w-1/2">
						<SearchBar placeholder="Search Alerts" />
					</div>

					{/* FILTER ICON */}
					<div className="w-10 h-10 cursor-pointer">
						<Icon
							icon="mdi:filter-variant"
							className="w-full h-full text-[#817b70]"
						/>
					</div>
				</div>

				<div className="w-full flex justify-center lg:mb-10 mb-5 px-3 shrink-0">
					<ul className="w-full flex items-center gap-5">
						{tabs.map((t, i) => {
							const activeTab = pathName === t.route;

							return (
								<Link
									key={i}
									href={t.route}
									className={`w-full cursor-pointer py-2 bg-[#e2e2e6] rounded-lg transition-all duration-150 ease-in  ${activeTab ? "bg-[#ffdb4f] text-[#704500]" : "text-[#817b70] hover:bg-[#ffdb4f]/60"}`}>
									<li className="Poppins-SemiBold text-center lg:text-xl text-sm">
										{t.label}
									</li>
								</Link>
							);
						})}
					</ul>
				</div>

				<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto">
					{children}
				</div>
			</div>
		</div>
	);
};

export default layout;
