import * as Icons from "@/public/assets/icons/icons";
import Image from "next/image";
import { Button } from "./ui/Button";
import { Icon } from "@iconify/react";

const HiveIcon = {
	healthy: {
		icon: Icons.hive4,
		color: "#00cc00",
	},
	weak: {
		icon: Icons.hive,
		color: "#ffdb4f",
	},
	need_attention: {
		icon: Icons.hive3,
		color: "#f89d36",
	},
	diseased: {
		icon: Icons.hive2,
		color: "#ff0000",
	},
};

export type HiveProps = {
	hiveId?: string;
	hive?: string;
	location?: string;
	lastCheck?: string;
	status: "healthy" | "weak" | "need attention" | "diseased";
	yieldThisMonth?: string;
	hiveState?: string;
	hiveHealthButton?: () => void;
	addYieldButton?: () => void;
	history?: () => void;
	replacement?: () => void;
};

function getHiveIconKey(status: HiveProps["status"]) {
	return status.replace(" ", "_") as keyof typeof HiveIcon;
}

export const HiveDetailsContainer = ({
	hiveHealthButton,
	addYieldButton,
	history,
	replacement,
	hiveId,
	hive,
	location,
	lastCheck,
	status,
	hiveState,
}: HiveProps) => {
	const iconKey = getHiveIconKey(status);

	return (
		<div className="flex flex-col gap-4 w-md">
			{/* QUEEN BEE REPLACEMENT WARNING */}
			{(status === "weak" || status === "need attention") && (
				<div className="bg-[#FAEEDA] border-2 border-[#FAC775] border-solid rounded-lg p-2 flex flex-1 items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7">
							<Icon
								icon="octicon:alert-16"
								className="w-full h-full text-[#854F0B]"
							/>
						</div>
						<p className="Poppins-Bold text-[#854F0B] text-[10px] w-3/4">
							Replacing the queen bee is recommended to improve
							the hive's health and productivity.
						</p>
					</div>

					<button
						type="button"
						onClick={replacement}
						className="Poppins-SemiBold bg-[#ffdb4f] text-[#412402] text-xs py-1 px-2 rounded-md text-nowrap cursor-pointer">
						Replace Queen
					</button>
				</div>
			)}

			{/* HIVES DETAILS */}
			<div
				className="border-2 border-[#e2e2e6] rounded-2xl p-5 capitalize flex gap-5"
				style={{
					boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
				}}>
				{/* LEFT */}
				<div
					className="flex justify-center items-center p-10 rounded-md border"
					style={{
						backgroundColor: `${HiveIcon[iconKey].color}33`,
						borderColor: HiveIcon[iconKey].color,
					}}>
					<div
						className="w-20 h-20 rounded-full flex justify-center items-center p-2"
						style={{
							backgroundColor: `${HiveIcon[iconKey].color}4D`,
						}}>
						<Image
							src={HiveIcon[iconKey].icon}
							alt="hive_icon"
							className="w-full h-full"
							priority
						/>
					</div>
				</div>

				{/* RIGHT */}
				<div className="w-full">
					{/* HIVE ID */}
					<h1 className="Poppins-Bold text-2xl">{hiveId}</h1>

					{/* NAME */}
					<h2 className="Poppins-Bold text-xl italic mb-4">
						{hive}
					</h2>

					{/* LOCATION AND DATE CHECK */}
					<div className="flex flex-col mb-15">
						<span className="Poppins-SemiBold text-[#817b70] text-sm">
							Location: {location}
						</span>
						<span className="Poppins-SemiBold text-[#817b70] text-sm">
							Last Check: {lastCheck}
						</span>
					</div>

					{/* YIELD TOTAL FO THIS MONTH */}
					<h3 className="text-[#817b70] text-sm">
						Yield(This Month)
					</h3>
					<span className="Poppins-SemiBold text-sm">5.2 Kg</span>

					{/* HIVE STATE AND HEALTH */}
					<div className="flex justify-between items-center mt-5">
						{/* HIVE STATE */}
						<div className="flex flex-col">
							<h2 className="text-sm text-[#a6a3a3]">
								Hive State
							</h2>
							<span className="Poppins-SemiBold text-sm">
								{hiveState}
							</span>
						</div>

						{/* HEALTH STATUS */}
						<div className="flex flex-col">
							<h2 className="text-sm text-[#a6a3a3]">
								Health Status
							</h2>
							<span
								className="Poppins-SemiBold text-sm"
								style={{ color: HiveIcon[iconKey].color }}>
								{status}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* BUTTONS */}
			<div className="flex flex-col items-center justify-center gap-5">
				<div className="w-full flex items-center justify-center gap-3">
					<Button
						label="Monitor Hive Health"
						onClick={hiveHealthButton}
					/>
					<Button label="Add Yield" onClick={addYieldButton} />
				</div>
				<span
					onClick={history}
					className="Poppins-SemiBold cursor-pointer underline text-[#817b70]">
					View Yield History
				</span>
			</div>
		</div>
	);
};

export const HiveTabs = ({
	hiveId,
	hive,
	location,
	lastCheck,
	status,
	yieldThisMonth,
	hiveState,
}: HiveProps) => {
	const iconKey = getHiveIconKey(status);
	const { icon, color } = HiveIcon[iconKey];

	return (
		<div
			className="border-2 border-[#e2e2e6] rounded-2xl p-5 capitalize flex gap-5"
			style={{
				boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
			}}>
			{/* LEFT */}
			<div
				className="flex justify-center items-center p-5 rounded-md border border-[#ffdb4f]"
				style={{ borderColor: color, backgroundColor: `${color}33` }}>
				<div
					className="w-15 h-15 rounded-full flex justify-center items-center p-2"
					style={{ backgroundColor: `${color}4D` }}>
					<Image
						src={icon}
						alt="hive_icon"
						className="w-full h-full"
						priority
					/>
				</div>
			</div>

			{/* RIGHT */}
			<div className="w-full">
				{/* HIVE ID */}
				<div className="flex justify-between items-center">
					<h1 className="Poppins-Bold text-2xl">{hiveId}</h1>
					<span
						className="Poppins-SemiBold text-xs py-0.5 px-3 rounded-sm"
						style={{
							color: color,
							backgroundColor: `${color}4D`,
						}}>
						{status}
					</span>
				</div>

				{/* NAME */}
				<h2 className="Poppins-Bold text-lg italic">{hive}</h2>

				{/* LOCATION AND DATE CHECK */}
				<div className="flex flex-col">
					<span className="Poppins-SemiBold text-[#817b70] text-xs">
						Location: {location}
					</span>
					<span className="Poppins-SemiBold text-[#817b70] text-xs">
						Last Check: {lastCheck}
					</span>
				</div>

				{/* YIELD TOTAL FOR THIS MONTH AND HEALTH */}
				<div className="flex justify-between items-center mt-5">
					{/* YIELD TOTAL FOR THIS MONTH */}
					<div className="flex flex-col">
						<h2 className="text-[#817b70] text-sm">
							Yield(This Month)
						</h2>
						<span className="Poppins-SemiBold text-sm">
							{yieldThisMonth}
						</span>
					</div>

					{/* HEALTH STATUS */}
					<div className="flex flex-col">
						<h2 className="text-sm text-[#a6a3a3]">Hive State</h2>
						<span className="Poppins-SemiBold text-sm">
							{hiveState}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export const HiveTrans = ({
	hiveId,
	hive,
	location,
	lastCheck,
	status,
}: HiveProps) => {
	const iconKey = getHiveIconKey(status);
	const { icon, color } = HiveIcon[iconKey];

	return (
		<div className="rounded-2xl capitalize flex gap-5">
			{/* LEFT */}
			<div
				className="flex justify-center items-center p-5 rounded-md border border-[#ffdb4f]"
				style={{ borderColor: color, backgroundColor: `${color}33` }}>
				<div
					className="w-15 h-15 rounded-full flex justify-center items-center p-2"
					style={{ backgroundColor: `${color}4D` }}>
					<Image
						src={icon}
						alt="hive_icon"
						className="w-full h-full"
						priority
					/>
				</div>
			</div>

			{/* RIGHT */}
			<div className="w-full">
				{/* HIVE ID */}
				<h1 className="Poppins-Bold text-2xl">{hiveId}</h1>

				{/* NAME */}
				<h2 className="Poppins-Bold text-lg italic">{hive}</h2>

				{/* LOCATION AND DATE CHECK */}
				<div className="flex flex-col">
					<span className="Poppins-SemiBold text-[#817b70] text-xs">
						Location: {location}
					</span>
					<span className="Poppins-SemiBold text-[#817b70] text-xs">
						Last Check: {lastCheck}
					</span>
				</div>
			</div>
		</div>
	);
};
