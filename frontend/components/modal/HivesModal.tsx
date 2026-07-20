"use client";

import { Icon } from "@iconify/react";
import React, { useState } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ModalContainer } from "./Modal";
import { HiveTrans } from "../HiveContainer";

type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm?: () => void;
};

type MonitoringEntry = {
	date: string;
	status: string;
};

type HarvestEntry = {
	date: string;
	yield: string;
};

const monitoringData: MonitoringEntry[] = [
	{ date: "May 15, 2026", status: "Active" },
	{ date: "May 13, 2026", status: "Active" },
	{ date: "April 28, 2026", status: "Active" },
	{ date: "April 20, 2026", status: "Active" },
	{ date: "April 10, 2026", status: "Active" },
	{ date: "March 30, 2026", status: "Active" },
	{ date: "March 18, 2026", status: "Active" },
	{ date: "March 05, 2026", status: "Active" },
];

const harvestData: HarvestEntry[] = [
	{ date: "May 15, 2026", yield: "1.5kg" },
	{ date: "May 13, 2026", yield: "2.2kg" },
	{ date: "April 28, 2026", yield: "1.8kg" },
	{ date: "April 20, 2026", yield: "2.0kg" },
	{ date: "April 10, 2026", yield: "1.2kg" },
	{ date: "March 30, 2026", yield: "1.7kg" },
	{ date: "March 18, 2026", yield: "2.1kg" },
	{ date: "March 05, 2026", yield: "1.3kg" },
];

const HealthStatus = [
	{ label: "Healthy", color: "#009900" },
	{ label: "Weak", color: "#e6c347" },
	{ label: "Needs Attention", color: "#d9822a" },
	{ label: "Diseased", color: "#cc0000" },
];

const PhysicalInfection = [
	{ label: "Normal / Healthy" },
	{ label: " Presence of Queen Cells" },
	{ label: "Reduction of Open Brood " },
	{ label: "Emaciated Queen" },
];

export const AddHiveModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="w-1/3"
			header="Add New Hive"
			onClose={onClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onConfirm?.();
				}}
				className="w-full flex flex-col gap-3">
				{/* INPUT FIELD */}
				<Input label="Hive Name" />
				<Input label="Bee Species" />
				<Input label="Date Established" />
				<Input label="Hive State" />
				<Input label="Yield from last season (if any)" />

				{/* HEALTH STATUS */}
				<div className="grid grid-cols-2 gap-2 mb-3">
					{HealthStatus.map((stat, i) => (
						<label
							key={i}
							className="rounded-lg p-2 group transition-all cursor-pointer border-2 border-transparent bg-(--stat-bg) has-[input:checked]:bg-[#a6a3a3]/20 has-[input:checked]:border-2 has-[input:checked]:border-[#a6a3a3]"
							style={
								{
									boxShadow:
										"rgba(0, 0, 0, 0.24) 0px 3px 8px",
									"--stat-bg": `${stat.color}33`,
								} as React.CSSProperties
							}>
							<div className="flex justify-center items-center">
								<input
									type="radio"
									name="healthStatus"
									className="hidden"
								/>
								<span
									className="Poppins-SemiBold text-sm"
									style={{ color: stat.color }}>
									{stat.label}
								</span>
							</div>
						</label>
					))}
				</div>

				<Button buttonType="submit" label="Add" />
			</form>
		</ModalContainer>
	);
};

export const MonitorHealth = ({ isOpen, onClose, onConfirm }: ModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="w-1/3"
			header="Monitor Hive Health"
			onClose={onClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onConfirm?.();
				}}
				className="w-full flex flex-col gap-3">
				{/* INPUT FIELD */}
				<Input label="Hive Name" value="Apis Cerana" disabled />
				<Input label="Bee Species" value="Duolingo" disabled />
				<Input label="Activity Type" />
				<Input label="Activity Date" />
				<Input label="Remarks (Optional)" />

				{/* HEALTH STATUS */}
				<label htmlFor="" className="lg:text-base text-xs text-black">
					Physical Inspection
				</label>
				<div className="grid grid-cols-2 gap-2 mb-3">
					{PhysicalInfection.map((pi, i) => (
						<label
							key={i}
							className="rounded-lg p-2 group transition-all cursor-pointer border-2 border-transparent has-[input:checked]:bg-[#a6a3a3]/20 has-[input:checked]:border-2 has-[input:checked]:border-[#a6a3a3]"
							style={{
								boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
							}}>
							<div className="flex justify-start items-center gap-2">
								<input
									type="radio"
									name="healthStatus"
									className="hidden"
								/>
								<div className="w-4.25 h-4.25 rounded-sm border border-[#a6a3a3]">
									<Icon
										icon="iconamoon:check-bold"
										className="hidden w-full h-full text-[#4A2F00] group-has-[input:checked]:block"
									/>
								</div>
								<span className="Poppins-SemiBold text-xs">
									{pi.label}
								</span>
							</div>
						</label>
					))}
				</div>
				<Button buttonType="submit" label="Log Maintenance" />
			</form>
		</ModalContainer>
	);
};

export const AddYield = ({ isOpen, onClose, onConfirm }: ModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="w-1/4"
			header="Add Yield"
			onClose={onClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onConfirm?.();
				}}
				className="w-full flex flex-col gap-3">
				{/* INPUT FIELD */}
				<Input label="Hive Number" value="Hive #001" disabled />
				<Input label="Bee Species" value="Duolingo" disabled />
				<Input
					label="Date Established"
					value={new Date().toLocaleDateString("en-US")}
					disabled
				/>
				<Input label="Harvest Date" />
				<Input label="Total Yield" />

				<div className="mt-3">
					<Button buttonType="submit" label="Add" />
				</div>
			</form>
		</ModalContainer>
	);
};

// groups entries by "Month Year"
const groupByMonth = <T extends { date: string }>(
	data: T[],
): Record<string, T[]> => {
	const groups: Record<string, T[]> = {};

	data.forEach((entry: T) => {
		const parsed = new Date(entry.date);
		const key = parsed.toLocaleString("en-US", {
			month: "long",
			year: "numeric",
		});

		if (!groups[key]) groups[key] = [];
		groups[key].push(entry);
	});

	return groups;
};

export const ViewHistory = ({ isOpen, onClose }: ModalProps) => {
	const [activeTab, setActiveTab] = useState<"monitoring" | "harvest">(
		"monitoring",
	);

	const grouped =
		activeTab === "monitoring"
			? groupByMonth(monitoringData)
			: groupByMonth(harvestData);

	return (
		<ModalContainer
			open={isOpen}
			width="w-1/3"
			height="h-full"
			header="Transaction History"
			onClose={onClose}>
			{/* TABS */}
			<div className="w-full flex justify-between items-center gap-3">
				<button
					type="button"
					onClick={() => setActiveTab("monitoring")}
					className={`Poppins-SemiBold w-full p-2 rounded-lg ${
						activeTab === "monitoring"
							? "bg-[#FFC700]"
							: "bg-[#e2e2e6]"
					}`}>
					Monitoring
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("harvest")}
					className={`Poppins-SemiBold w-full p-2 rounded-lg ${
						activeTab === "harvest"
							? "bg-[#FFC700]"
							: "bg-[#e2e2e6]"
					}`}>
					Harvest
				</button>
			</div>

			<HiveTrans
				hiveId="Hive #001"
				hive="duolingo"
				location="Baguio City"
				lastCheck="dasdasa"
				status="healthy"
				yieldThisMonth="May 15, 2026"
			/>

			<div className="border-2 border-[#e2e2e6] rounded-xl p-2 flex-1 flex flex-col gap-5 overflow-y-auto overflow-x-hidden min-h-0">
				<table className="w-full border-collapse">
					<tbody>
						{Object.entries(grouped).map(
							([month, entries]: [
								string,
								(MonitoringEntry | HarvestEntry)[],
							]) => (
								<React.Fragment key={month}>
									{/* MONTH HEADER ROW */}
									<tr className="border-b border-[#e0e0e0]">
										<td
											colSpan={2}
											className="Poppins-Bold text-sm px-4 py-3 uppercase text-[#4A2F00]">
											{month}
										</td>
									</tr>

									{/* ENTRIES */}
									{entries.map(
										(
											entry:
												| MonitoringEntry
												| HarvestEntry,
											idx: number,
										) => (
											<tr
												key={`${month}-${idx}`}
												className="border-b border-[#e0e0e0] last:border-b-0">
												<td className="px-4 py-3 text-sm text-center text-[#6b6b6b]">
													{entry.date}
												</td>
												<td className="px-4 py-3 text-sm text-center text-[#6b6b6b]">
													{activeTab === "monitoring"
														? (
																entry as MonitoringEntry
															).status
														: (
																entry as HarvestEntry
															).yield}
												</td>
											</tr>
										),
									)}
								</React.Fragment>
							),
						)}
					</tbody>
				</table>
			</div>
		</ModalContainer>
	);
};

export const QueenReplace = ({ isOpen, onClose, onConfirm }: ModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="w-1/4"
			header="Replace the Queen Bee"
			onClose={onClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onConfirm?.();
				}}
				className="w-full flex flex-col gap-3">
				{/* INPUT FIELD */}
				<Input label="Date of Replacement" type="date" />

				<div className="mt-3">
					<Button buttonType="submit" label="Replace" />
				</div>
			</form>
		</ModalContainer>
	);
};
