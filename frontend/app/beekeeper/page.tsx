import { HiveHealthChart } from "@/components/graph/Doughnut";
import { YieldSummaryChart } from "@/components/graph/Line";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { UserNav } from "@/components/ui/UserNav";
import { Icon } from "@iconify/react";
import {
	BeefarmOperation,
	BeeFarmProps,
} from "@/components/ui/BeefarmContainer";
import { PesticideAlert, AlertProps } from "@/components/ui/Alert";

import * as Icons from "@/public/assets/icons/icons";

// NEARBY FARM EXAMPLE DATA
import beefarmsData from "@/data/beefarms.json";
const beefarms = beefarmsData as BeeFarmProps[];

// ALERT DETAILS EXAMPLE DATE
import pesticideDetailsData from "@/data/pesticideDetails.json";
const pesticideAlert = pesticideDetailsData as AlertProps[];

// CARD CONTENTS
const statusCard = [
	{
		icon: Icons.hive,
		count: "12",
		title: "total hives",
		color: "#ffdb4f",
	},
	{
		icon: Icons.health_search,
		count: "7",
		title: "healthy hives",
		color: "#00cc00",
	},
	{
		icon: Icons.alert,
		count: "3",
		title: "active alerts",
		color: "#ff0000",
	},
	{
		icon: Icons.honey_jar,
		count: "24.6kg",
		title: "total yield",
		color: "#38b6ff",
	},
];

const hiveHealthData = [
	{ label: "Healthy", value: 7, color: "#4CAF50" },
	{ label: "Weak", value: 2, color: "#FFC93F" },
	{ label: "Needs Attention", value: 2, color: "#FF9800" },
	{ label: "Diseased", value: 1, color: "#FF0000" },
];

interface GraphProps {
	children?: React.ReactNode;
	title?: string;
}

// GRAPHS CONTAINER
const GraphContainer = ({ children, title }: GraphProps) => {
	return (
		<div
			className="w-1/2 border border-[#a6a3a3] rounded-2xl p-4 flex flex-col"
			style={{
				boxShadow: `rgba(0, 0, 0, 0.24) 0px 3px 8px`,
			}}>
			<h2 className="Poppins-SemiBold capitalize text-center text-xl mb-2">
				{title}
			</h2>
			{children}
		</div>
	);
};

const Beekeeper = () => {
	return (
		<div className="w-full h-full p-5 flex items-start flex-col gap-3">
			{/* USER NAVIGAATION BAAR */}
			<UserNav />

			{/* <div className="w-full h-full flex flex-col gap-3"> */}
			<div className="w-full flex gap-3">
				{/* LEFT SIDE */}
				<div className="w-1/3 flex flex-col gap-3">
					{/* PAGE TITLE */}
					<h2 className="Poppins-SemiBold text-[#a6a3a3] text-2xl">
						Dashboard
					</h2>

					{/* STATUS CARD */}
					<div className="w-full grid grid-cols-2 gap-3 flex-1">
						{statusCard.map((c, i) => (
							<Card
								key={i}
								icon={c.icon}
								count={c.count}
								title={c.title}
								color={c.color}
							/>
						))}
					</div>
				</div>

				{/* RIGHT SIDE */}
				<div className="w-2/3 flex items-stretch gap-3">
					<GraphContainer title="hive health">
						<HiveHealthChart data={hiveHealthData} />
					</GraphContainer>
					<GraphContainer title="yield summary">
						<YieldSummaryChart
							value="24.6kg"
							valueLabel="Total Hives"
							changeAmount={-8.4}
							changePercent={15}
							categories={["Jan", "Feb", "March", "April", "May"]}
							data={[10, 20, 15, 32, 24]}
						/>
					</GraphContainer>
				</div>
			</div>

			<div className="w-full flex-1 flex items-stretch gap-3 min-h-0">
				{/* LEFT CONTAINER */}
				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
							Operations{" "}
							<span
								className={`text-xs text-[#ffce1c] cursor-pointer ${beefarms.length > 0 ? "block" : "hidden"}`}>
								view all
							</span>
						</span>

						{beefarms && beefarms.length > 0 ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 p-2">
								{beefarms.map((nb, i) => (
									<BeefarmOperation
										key={i}
										image={nb.image}
										farmName={nb.farmName}
										location={nb.location}
										miles={nb.miles}
									/>
								))}
							</div>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
								<Icon
									icon="carbon:task-settings"
									className="w-20 h-20 text-[#a6a3a3]"
								/>
								<h2 className="w-1/2 Poppins-SemiBold text-x text-[#817b70]">
									No Operations
								</h2>
							</div>
						)}

						{/* BEEKEEPER NOT VERIFIED */}
						<div className="hidden w-full h-full flex-col items-center text-center">
							<Icon
								icon="mdi:alert-circle"
								className="w-20 h-20 text-[#ffce1c]"
							/>
							<h2 className="w-1/2 Poppins-SemiBold text-2xl">
								Beekeeper Account Not Verified
							</h2>
							<p className="w-2/3 text-xs text-[#817b70] font-light mb-5">
								Your beekeeper account is currently not
								verified. You must complete the verification
								process before you can accept or manage bee
								rescue requests
							</p>
							<Button label="verify your account" width="50%" />
						</div>
					</div>
				</Container>

				{/* RIGHT CONTAINER */}
				<Container width="100%" height="100%" scroll>
					<div className="w-full h-full flex flex-col items-start">
						<span className="sticky top-0 bg-white w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
							Recent Alerts{" "}
							<span
								className={`text-xs text-[#ffce1c] cursor-pointer ${pesticideAlert.length > 0 ? "block" : "hidden"}`}>
								view all
							</span>
						</span>

						{/* PESTICIDE ALERT */}
						{pesticideAlert && pesticideAlert.length > 0 ? (
							<div className="w-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 p-2">
								{pesticideAlert.map((pa, i) => (
									<PesticideAlert
										key={i}
										location={pa.location}
										date={pa.date}
										time={pa.time}
										status={pa.status}
									/>
								))}
							</div>
						) : (
							// IF NO ALERT
							<div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
								<Icon
									icon="famicons:notifications-off"
									className="w-20 h-20 text-[#a6a3a3]"
								/>
								<h2 className="w-1/2 Poppins-SemiBold text-x text-[#817b70]">
									No other alerts at the moment
								</h2>
							</div>
						)}
					</div>
				</Container>
			</div>
			{/* </div> */}
		</div>
	);
};

export default Beekeeper;
