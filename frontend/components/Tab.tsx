"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";

type TabItems = {
	label?: string;
	value: string;
};

type TabProps = {
	tabs: TabItems[];
	hasBg?: boolean;
};

export const Tab = ({ tabs, hasBg }: TabProps) => {
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
		<ul className="flex justify-around gap-3 overflow-x-auto whitespace-nowrap">
			{tabs.map((tab) => {
				const isActive = activeStatus === tab.value;
				return (
					<li
						key={tab.value}
						onClick={() => handleTabClick(tab.value)}
						className={`Poppins-SemiBold text-center text-sm cursor-pointer w-full transition-all duration-150 ease-in ${
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
