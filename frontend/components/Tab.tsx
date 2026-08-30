"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";

type TabItems = {
	label?: string;
	value: string;
};

type TabProps = {
	tabs: TabItems[];
};

export const Tab = ({ tabs }: TabProps) => {
    const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();

	const activeStatus = searchParams.get("status") || "all";

    const handleTabClick = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === "all") {
			params.delete("status");
		} else {
			params.set("status", value);
		}
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<ul className="flex justify-around gap-1">
			{tabs.map((tab) => {
				const isActive = activeStatus === tab.value;
				return (
					<li
						key={tab.value}
						onClick={() => handleTabClick(tab.value)}
						className={`Poppins-SemiBold bg-transparent text-center pb-1 border-b-3 transition-all duration-150 ease-in text-[#817b70] text-sm cursor-pointer w-full ${
							isActive
								? "border-b-[#ffce1c] text-[#ffce1c]"
								: "border-b-transparent hover:border-b-[#ffce1c] hover:text-[#ffce1c]"
						}`}>
						{tab.label}
					</li>
				);
			})}
		</ul>
	);
};
