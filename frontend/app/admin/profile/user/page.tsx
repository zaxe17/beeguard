"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HiveTabs } from "@/components/HiveContainer";
import { NavTab } from "@/components/Tab";
import { Button } from "@/components/ui/Button";
import { Container, FormContainer } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { ReportCard } from "@/components/ui/ReportCard";
import { Users } from "@/components/Users";

const tabs = [
	{ label: "Personal Information", value: "information" },
	{ label: "Farm & Hives", value: "farmhive" },
	{ label: "Activity", value: "activity" },
];

// USER INFORMATION
const Information = () => {
	return (
		<FormContainer width="lg:w-1/3 w-full">
			<div className="flex flex-col gap-3">
				<Input label="Full Name" />
				<Input label="Username" />
				<Input label="Email" />
				<Input label="Contact No." />
				<Input label="Address" />

				{/* BUTTON */}
				<div className="flex gap-3 mt-5">
					<Button label="Reset Password" bgNone />
					<Button label="Edit User" />
				</div>
			</div>
		</FormContainer>
	);
};

// USER FARM AND HIVE DETAILS
const FarmHives = () => {
	return (
		<Container width="lg:w-3/4 w-full">
			<div className="flex flex-col gap-3 h-full min-h-0">
				<div className="w-full flex items-center justify-start">
					<div className="lg:w-1/3 w-full">
						<Input label="Full Name" />
						<Input label="Apiary Type" />
					</div>
				</div>

				<div className="lg:p-2 p-0 grid lg:grid-cols-2 grid-cols-1 flex-1 gap-3 overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					<HiveTabs
						hiveId="HV-000005"
						hive="Laywone"
						location="Layone"
						lastCheck="August 7, 2026"
						status="healthy"
						yieldThisMonth="0.0kg"
						hiveState="Active"
					/>
					<HiveTabs
						hiveId="HV-000005"
						hive="Laywone"
						location="Layone"
						lastCheck="August 7, 2026"
						status="needs attention"
						yieldThisMonth="0.0kg"
						hiveState="Active"
					/>
					<HiveTabs
						hiveId="HV-000005"
						hive="Laywone"
						location="Layone"
						lastCheck="August 7, 2026"
						status="diseased"
						yieldThisMonth="0.0kg"
						hiveState="Active"
					/>
				</div>
			</div>
		</Container>
	);
};

// USER ACTIVITY
const Activity = () => {
	return (
		<Container width="lg:w-1/2 w-full">
			<div className="flex flex-col gap-3 h-full min-h-0">
				<div className="lg:p-2 p-0 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					{Array.from({ length: 14 }).map((_, i) => (
						<ReportCard key={i} status="in-progress" />
					))}
				</div>
			</div>
		</Container>
	);
};

const UserInner = () => {
	const searchParams = useSearchParams();
	const activeTab = searchParams.get("tab") || "information";

	return (
		<div className="p-4 flex flex-col w-full h-screen min-h-0 overflow-hidden">
			<div className="lg:w-1/3 w-full shrink-0">
				<Users
					name="Jan Marc S. Jacolbia"
					role="citizen"
					email="jmjacolbia@gmail.com"
					phoneNo="0926 542 4417"
					status="active"
				/>
			</div>

			<div className="w-full flex-1 min-h-0 flex flex-col items-center">
				<div className="w-full h-full min-h-0 flex flex-col items-center">
					<div className="lg:w-2/3 w-full">
						<NavTab tabs={tabs} />
					</div>

					<div className="w-full flex-1 min-h-0 flex flex-col justify-start items-center lg:mt-10 lg:scrollbar-auto scrollbar-none">
						{activeTab === "information" && <Information />}
						{activeTab === "farmhive" && <FarmHives />}
						{activeTab === "activity" && <Activity />}
					</div>
				</div>
			</div>
		</div>
	);
};

const User = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<UserInner />
		</Suspense>
	);
};

export default User;
