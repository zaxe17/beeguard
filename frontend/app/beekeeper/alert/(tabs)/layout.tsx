"use client";

import { FilterContainer } from "@/components/popup/Filter";
import { SearchBar } from "@/components/ui/Input";
import { useModal } from "@/context/ModalContext";
import {
	ALERT_FILTER_OPTIONS,
	AlertFilterProvider,
	useAlertFilter,
	type AlertFilter,
} from "@/context/AlertFilterContext";
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

// Header (add / search / filter / tabs). Inside the provider so the
// search bar and filter can update what the All / Today pages show.
const AlertHeader = () => {
	const pathName = usePathname();
	const { openModal } = useModal<ModalType>();
	const { filter, setFilter, search, setSearch } = useAlertFilter();

	return (
		<>
			<div className="flex justify-end items-center gap-3 px-2 mb-5 shrink-0">
				{/* ADD BUTTON */}
				<div
					onClick={() => openModal("addAlert")}
					className="w-8 h-8 shrink-0 bg-[#ffdb4f] rounded-full cursor-pointer">
					<Icon icon="tdesign:add" className="w-8 h-8 text-white" />
				</div>

				{/* SEARCHBAR ALERTS — by place, e.g. "Moonwalk" */}
				<div className="lg:w-1/3 w-full">
					<SearchBar
						placeholder="Search Alerts"
						value={search}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearch(e.target.value)
						}
					/>
				</div>

				{/* FILTER ICON */}
				<FilterContainer
					title="Show"
					label={ALERT_FILTER_OPTIONS}
					value={filter}
					onChange={(v) => setFilter(v as AlertFilter)}
				/>
			</div>

			<div className="w-full flex justify-center lg:mb-10 mb-5 px-3 shrink-0">
				<ul className="w-full flex items-center gap-5">
					{tabs.map((t, i) => {
						const activeTab = pathName === t.route;

						return (
							<Link
								key={i}
								href={t.route}
								className={`w-full cursor-pointer py-2 bg-[#e2e2e6] rounded-lg transition-all duration-130 ease-in  ${activeTab ? "bg-[#ffdb4f] text-[#704500]" : "text-[#817b70] hover:bg-[#ffdb4f]/60"}`}>
								<li className="Poppins-SemiBold text-center lg:text-xl text-sm">
									{t.label}
								</li>
							</Link>
						);
					})}
				</ul>
			</div>
		</>
	);
};

const layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<AlertFilterProvider>
			<div className="h-screen w-full flex justify-center items-center overflow-hidden">
				<div className="h-full lg:w-1/2 w-full flex flex-col lg:pt-10 pt-5 pb-3 min-h-0">
					<AlertHeader />

					<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto">
						{children}
					</div>
				</div>
			</div>
		</AlertFilterProvider>
	);
};

export default layout;