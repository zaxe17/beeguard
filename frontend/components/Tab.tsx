"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Switch } from "./ui/Switch";
import { Icon } from "@iconify/react";
import React, { useState } from "react";

type TabItems = {
	label?: string;
	value: string;
};

type TabProps = {
	tabs: TabItems[];
	hasBg?: boolean;
};

export const NavTab = ({ tabs, hasBg }: TabProps) => {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();

	const activeStatus = searchParams.get("tab") || tabs[0]?.value;

	const handleTabClick = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === tabs[0]?.value) {
			params.delete("tab");
		} else {
			params.set("tab", value);
		}
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<ul className="flex justify-around lg:gap-3 gap-2 overflow-x-auto whitespace-nowrap">
			{tabs.map((tab) => {
				const isActive = activeStatus === tab.value;
				return (
					<li
						key={tab.value}
						onClick={() => handleTabClick(tab.value)}
						className={`Poppins-SemiBold text-center lg:text-sm text-xs cursor-pointer w-full px-1 transition-all duration-130 ease-in ${
							hasBg
								? `py-1.5 rounded-lg ${
										isActive
											? "bg-[#ffdb4f] text-[#704500]"
											: "bg-[#e4e1ea] text-[#817b70] hover:bg-[#ffdb4f]/60"
									}`
								: `border-b-3 pb-1 ${
										isActive
											? "border-b-[#ffce1c] text-[#ffce1c]"
											: "border-b-transparent text-[#817b70] hover:border-b-[#ffce1c] hover:text-[#ffce1c]"
									}`
						}`}>
						{tab.label}
					</li>
				);
			})}
		</ul>
	);
};

type SettingsProps = {
	icon: string;
	label: string;
	desc?: string;
	onClick?: () => void;
	active?: boolean;
	subContent?: React.ReactNode;
};

export const SettingsTabs = ({
	icon,
	label,
	onClick,
	active,
	desc,
	subContent,
}: SettingsProps) => {
	return (
		<div
			onClick={onClick}
			className={`w-full group rounded-xl p-2.5 capitalize flex flex-row gap-5 items-center justify-between transition-all duration-130 ease-in ${subContent ? "" : "hover:bg-[#ffdb4f] cursor-pointer"} ${
				active ? "bg-[#ffdb4f]" : ""
			}`}
			style={{
				boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
			}}>
			{/* ICONS AND LABEL */}
			<div className="flex items-center gap-2">
				{/* ICON */}
				<div className="w-8 h-8">
					<Icon icon={icon} className="w-8 h-8 text-[#4a2f00]" />
				</div>
				<div className="flex flex-col">
					<span className="Poppins-SemiBold text-[#4a2f00]">
						{label}
					</span>
					<span className="text-xs text-[#817b70]">{desc}</span>
					{subContent && <div className="mt-3">{subContent}</div>}
				</div>
			</div>

			{/* ARROW LEFT */}
			{!subContent && (
				<div className="w-5 h-5">
					<Icon
						icon="ep:arrow-right-bold"
						className="w-5 h-5 text-[#817b70]"
					/>
				</div>
			)}
		</div>
	);
};

export const SwitchTab = ({ icon, label, desc }: SettingsProps) => {
	const [enabled, setEnabled] = useState(true);

	return (
		<div
			className="group rounded-xl p-2.5 capitalize flex flex-row gap-5 items-center justify-between"
			style={{
				boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
			}}>
			{/* ICONS AND LABEL */}
			<div className="flex items-center gap-2">
				{/* ICON */}
				<div className="w-8 h-8">
					<Icon icon={icon} className="w-8 h-8 text-[#4a2f00]" />
				</div>
				<div className="flex flex-col">
					<span className="Poppins-SemiBold text-[#4a2f00]">
						{label}
					</span>
					<span className="text-xs text-[#817b70]">{desc}</span>
				</div>
			</div>

			{/* ARROW LEFT */}
			<Switch checked={enabled} onChange={setEnabled} />
		</div>
	);
};
