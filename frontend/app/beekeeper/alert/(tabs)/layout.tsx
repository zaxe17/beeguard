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
		<div className="h-screen w-full flex justify-center items-center">
			<div className="h-full w-1/2 flex flex-col justify-center pt-10 pb-5">
				<div className="flex justify-end items-center gap-3 mb-8">
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
					<div className="w-1/3">
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

				<div className="w-full flex justify-center mb-10 px-3">
					<ul className="w-full flex items-center gap-5">
						{tabs.map((t, i) => {
							const activeTab = pathName === t.route;

							return (
								<Link
									key={i}
									href={t.route}
									className={`w-full cursor-pointer py-2 bg-[#e2e2e6] rounded-lg transition-all duration-100 ease-in  ${activeTab ? "bg-[#ffdb4f] text-[#704500]" : "hover:bg-[#ffdb4f] hover:text-[#704500]"}`}>
									<li className="Poppins-SemiBold text-center text-xl ">
										{t.label}
									</li>
								</Link>
							);
						})}
					</ul>
				</div>

				<div className="flex-1 min-h-0 flex flex-col scroll-container">
					{children}
				</div>
			</div>
		</div>
	);
};

export default layout;
