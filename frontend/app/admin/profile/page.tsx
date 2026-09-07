"use client";

import { Tab } from "@/components/Tab";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import Users from "@/components/Users";
import { SearchBar } from "@/components/ui/Input";
import { Icon } from "@iconify/react";
import { report } from "process";

const tabs = [
	{ label: "All (1,248)", value: "all" },
	{ label: "Citizens(906)", value: "citizen" },
	{ label: "Beekeeepers (342)", value: "beekeeper" },
];

const ProfileContainerInner = () => {
	const searchParams = useSearchParams();
	const activeStatus = searchParams.get("tab") || "all";
	const dummyReports = [
		{
			name: "Jan Marc S. Jacolbia",
			role: "citizen",
			email: "jmjacolbia@gmail.com",
			phoneNo: "0926 542 4417",
			status: "active",
		},
		{
			name: "Maria Clara D. Santos",
			role: "beekeeper",
			email: "mcsantos@gmail.com",
			phoneNo: "0917 233 8821",
			status: "active",
		},
		{
			name: "Ramon P. Dela Cruz",
			role: "citizen",
			email: "rpdelacruz@gmail.com",
			phoneNo: "0908 671 4490",
			status: "inactive",
		},
		{
			name: "Andres L. Bonifacio",
			role: "beekeeper",
			email: "albonifacio@gmail.com",
			phoneNo: "0935 120 7762",
			status: "active",
		},
		{
			name: "Josefa T. Reyes",
			role: "citizen",
			email: "jtreyes@gmail.com",
			phoneNo: "0921 884 3305",
			status: "inactive",
		},
		{
			name: "Emilio G. Aguinaldo",
			role: "beekeeper",
			email: "egaguinaldo@gmail.com",
			phoneNo: "0947 502 6618",
			status: "active",
		},
		{
			name: "Gabriela M. Silang",
			role: "citizen",
			email: "gmsilang@gmail.com",
			phoneNo: "0929 315 9924",
			status: "active",
		},
		{
			name: "Melchora F. Aquino",
			role: "beekeeper",
			email: "mfaquino@gmail.com",
			phoneNo: "0918 743 2087",
			status: "inactive",
		},
		{
			name: "Apolinario C. Mabini",
			role: "citizen",
			email: "acmabini@gmail.com",
			phoneNo: "0906 458 1173",
			status: "active",
		},
		{
			name: "Teodora A. Alonzo",
			role: "beekeeper",
			email: "taalonzo@gmail.com",
			phoneNo: "0933 267 5540",
			status: "inactive",
		},
	] as const;

	return (
		<div className="h-screen pt-10 flex justify-center">
			<div className="w-1/2 flex flex-col min-h-0">
				<div className="flex justify-end items-center gap-3 mb-8">
					{/* SEARCHBAR */}
					<div className="w-1/3">
						<SearchBar placeholder="Search Users" />
					</div>

					{/* FILTER ICON */}
					<div className="w-10 h-10 cursor-pointer">
						<Icon
							icon="mdi:filter-variant"
							className="w-full h-full text-[#817b70]"
						/>
					</div>
				</div>

				{/* TABS */}
				<Tab tabs={tabs} hasBg />

				<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto px-3 my-5">
					<div className="mt-5 flex flex-col gap-3 pb-3">
						{dummyReports
							.filter(
								(report) =>
									activeStatus === "all" ||
									activeStatus === report.role,
							)
							.map((report, i) => (
								<Users
									key={`${report.status}-${i}`}
									name={report.name}
									role={report.role}
									email={report.email}
									phoneNo={report.phoneNo}
									status={report.status}
								/>
							))}
					</div>
				</div>
			</div>
		</div>
	);
};

const Profile = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<ProfileContainerInner />
		</Suspense>
	);
};

export default Profile;
