"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HiveTabs } from "@/components/HiveContainer";
import { Tab } from "@/components/Tab";
import { Button } from "@/components/ui/Button";
import { Container, FormContainer } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { ReportCard } from "@/components/ui/ReportCard";
import Users from "@/components/Users";

const tabs = [
	{ label: "Personal Information", value: "information" },
	{ label: "Farm & Hives", value: "farmhive" },
	{ label: "Activity", value: "activity" },
];

// USER INFORMATION
const Information = () => {
	return (
		<FormContainer width="w-2/3">
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
		<Container width="w-2/3">
			<div className="flex flex-col gap-3 h-full min-h-0">
				<div className="w-full flex items-center justify-center">
					<div className="w-2/3">
						<Input label="Full Name" />
						<Input label="Apiary Type" />
					</div>
				</div>

				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0">
					<HiveTabs
						hiveId="HV-000005"
						hive="Laywone"
						location="Layone"
						lastCheck="August 7, 2026"
						status="need attention"
						yieldThisMonth="0.0kg"
						hiveState="Active"
					/>
					<HiveTabs
						hiveId="HV-000005"
						hive="Laywone"
						location="Layone"
						lastCheck="August 7, 2026"
						status="need attention"
						yieldThisMonth="0.0kg"
						hiveState="Active"
					/>
					<HiveTabs
						hiveId="HV-000005"
						hive="Laywone"
						location="Layone"
						lastCheck="August 7, 2026"
						status="need attention"
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
		<Container width="w-2/3">
			<div className="flex flex-col gap-3 h-full min-h-0">
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0">
					{Array.from({ length: 14 }).map((_, i) => (
						<ReportCard key={i} status="progress" />
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
			<div className="w-1/3 shrink-0">
				<Users
					name="Jan Marc S. Jacolbia"
					role="citizen"
					email="jmjacolbia@gmail.com"
					phoneNo="0926 542 4417"
					status="active"
				/>
			</div>

			<div className="w-full flex-1 min-h-0 flex flex-col items-center">
				<div className="w-2/3 h-full min-h-0 flex flex-col">
					<Tab tabs={tabs} />

					<div className="flex-1 min-h-0 flex flex-col justify-start items-center mt-10">
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
