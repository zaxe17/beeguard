"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BeefarmView from "@/components/BeefarmView";
import { Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/ui/Input";

import { Icon } from "@iconify/react";
import { PesticideAlert } from "@/components/ui/Alert";
import { Tab } from "@/components/Tab";

const tabs = [
	{ label: "All", value: "all" },
	{ label: "High", value: "high" },
	{ label: "Medium", value: "medium" },
	{ label: "Low", value: "low" },
];

const dummyAlerts = [
	{
		location: "Atok, Benguet",
		date: "May 16, 2026",
		time: "8:00 AM",
		status: "high",
	},
	{
		location: "La Trinidad, Benguet",
		date: "May 15, 2026",
		time: "6:30 AM",
		status: "medium",
	},
	{
		location: "Buguias, Benguet",
		date: "May 14, 2026",
		time: "9:15 AM",
		status: "low",
	},
	{
		location: "Kibungan, Benguet",
		date: "May 13, 2026",
		time: "7:45 AM",
		status: "high",
	},
	{
		location: "Bakun, Benguet",
		date: "May 12, 2026",
		time: "10:00 AM",
		status: "medium",
	},
] as const;

const Map = dynamic(() => import("@/components/ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

const AlertInner = () => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("tab") || "all";

	const filteredAlerts = dummyAlerts.filter(
		(a) => activeStatus === "all" || activeStatus === a.status,
	);

	return (
		<div className="w-full h-full flex items-start lg:flex-row flex-col">
			{/* CONTAINER FOR BEEFARM LOCATION TAB */}
			<Container
				borderNone
				className="lg:w-[35%] w-full flex-1 lg:flex-none lg:h-full">
				<div className="relative w-full pt-5 px-2 flex items-center justify-end gap-3 mb-3">
					{/* BACK ARROW */}
					<Icon
						icon="bx:arrow-back"
						className="absolute left-0 text-2xl text-[#ffa004] lg:hidden block"
					/>

					<div className="flex items-center gap-3">
						{/* ADD BUTTON */}
						<div className="w-8 h-8 bg-[#ffdb4f] rounded-full cursor-pointer shrink-0">
							<Icon
								icon="tdesign:add"
								className="w-full h-full text-white"
							/>
						</div>

						{/* SEARCHBAR ALERTS */}
						<SearchBar placeholder="Search Alerts" />

						{/* FILTER ICON */}
						<div className="w-10 h-10 cursor-pointer shrink-0">
							<Icon
								icon="mdi:filter-variant"
								className="w-full h-full text-[#817b70]"
							/>
						</div>
					</div>
				</div>

				<Tab tabs={tabs} hasBg />

				{/* SCROLLABLE BEEFARM CARD */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0">
					{filteredAlerts.length > 0 ? (
						filteredAlerts.map((a, i) => (
							<PesticideAlert
								key={`${a.status}-${i}`}
								location={a.location}
								date={a.date}
								time={a.time}
								status={a.status}
							/>
						))
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
							<Icon
								icon="famicons:notifications-off"
								className="w-20 h-20 text-[#a6a3a3]"
							/>
							<h2 className="w-1/2 Poppins-SemiBold text-x text-[#817b70]">
								No alerts
							</h2>
						</div>
					)}
				</div>
			</Container>

			<div className="flex-1 w-full lg:h-full z-0">
				<div className="flex flex-col h-full">
					{/* LOCATION MAP */}
					<div className="flex-1">
						<Map />
					</div>

					{/* BEEFARM INFO */}
					<div className="flex-3 min-h-0 overflow-y-auto hidden">
						<BeefarmView />
					</div>
				</div>
			</div>
		</div>
	);
};

const AlertLocation = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<AlertInner />
		</Suspense>
	);
};

export default AlertLocation;
