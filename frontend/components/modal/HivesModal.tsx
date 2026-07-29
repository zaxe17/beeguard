"use client";

import { Icon } from "@iconify/react";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { ModalContainer } from "./Modal";
import { HiveTrans } from "../HiveContainer";
import {
	hiveService,
	HealthStatus,
	HiveState,
	InspectionObservation,
	MaintenanceRecord,
} from "@/services/hive";
import { yieldService, YieldRecord } from "@/services/harvest";
import { queenService } from "@/services/queen";

type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm?: () => void; // called after a successful action, in addition to the built-in close
};

const HealthStatusOptions: { label: string; value: HealthStatus; color: string }[] = [
	{ label: "Healthy", value: "Healthy", color: "#009900" },
	{ label: "Weak", value: "Weak", color: "#e6c347" },
	{ label: "Needs Attention", value: "Needs Attention", color: "#d9822a" },
	{ label: "Diseased", value: "Diseased", color: "#cc0000" },
];

const PhysicalInspectionOptions: InspectionObservation[] = [
	"Normal / Healthy",
	"Presence of Queen Cells",
	"Reduction of Open Brood",
	"Emaciated Queen",
];

// ── Shared history-entry shape ────────────────
// The Monitoring tab shows {date, status} rows, the Harvest tab shows
// {date, yield} rows. Previously groupByMonth was called separately
// with two different generic T's, producing a union Record type that
// TypeScript can't distribute Object.entries() over cleanly — that's
// what caused the "implicitly has an any type" error. Using one
// shared type (with both fields optional) for both tabs fixes it.
type HistoryEntry = {
	date: string;
	status?: string;
	yield?: string;
};

// groups entries by "Month Year"
const groupByMonth = (data: HistoryEntry[]): Record<string, HistoryEntry[]> => {
	const groups: Record<string, HistoryEntry[]> = {};

	data.forEach((entry) => {
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

// ─────────────────────────────────────────────
// ADD HIVE — no hive context needed (creates a new one)
// ─────────────────────────────────────────────
export const AddHiveModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
	const [hiveName, setHiveName] = useState("");
	const [beeSpecies, setBeeSpecies] = useState("");
	const [dateEstablished, setDateEstablished] = useState("");
	const [hiveState, setHiveState] = useState<HiveState>("Active");
	const [healthStatus, setHealthStatus] = useState<HealthStatus>("Healthy");
	const [histYieldKg, setHistYieldKg] = useState("");
	const [histYieldYear, setHistYieldYear] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const resetForm = () => {
		setHiveName("");
		setBeeSpecies("");
		setDateEstablished("");
		setHiveState("Active");
		setHealthStatus("Healthy");
		setHistYieldKg("");
		setHistYieldYear("");
		setErrorMsg(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);

		if (!hiveName.trim() || !beeSpecies.trim() || !dateEstablished) {
			setErrorMsg("Hive name, bee species, and date established are required.");
			return;
		}

		const hasKg = histYieldKg.trim() !== "";
		const hasYear = histYieldYear.trim() !== "";
		if (hasKg !== hasYear) {
			setErrorMsg("Provide both historical yield and year, or leave both blank.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await hiveService.create({
				hive_name: hiveName.trim(),
				bee_species: beeSpecies.trim(),
				date_established: dateEstablished,
				hive_state: hiveState,
				health_status: healthStatus,
				historical_yield_kg: hasKg ? parseFloat(histYieldKg) : null,
				historical_yield_year: hasYear ? parseInt(histYieldYear, 10) : null,
			});

			if (!res.success) {
				setErrorMsg(
					res.errors && res.errors.length > 0
						? res.errors.join(", ")
						: res.message,
				);
				setSubmitting(false);
				return;
			}

			resetForm();
			setSubmitting(false);
			onConfirm?.();
			onClose();
		} catch {
			setErrorMsg("Network error. Please try again.");
			setSubmitting(false);
		}
	};

	return (
		<ModalContainer
			open={isOpen}
			width="w-1/3"
			header="Add New Hive"
			onClose={onClose}>
			<form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
				<Input
					label="Hive Name"
					value={hiveName}
					onChange={(e) => setHiveName(e.target.value)}
				/>
				<Input
					label="Bee Species"
					value={beeSpecies}
					onChange={(e) => setBeeSpecies(e.target.value)}
				/>
				<Input
					label="Date Established"
					type="date"
					value={dateEstablished}
					onChange={(e) => setDateEstablished(e.target.value)}
				/>

				<div className="flex gap-2">
					<Input
						label="Historical Yield (kg, if any)"
						value={histYieldKg}
						onChange={(e) => setHistYieldKg(e.target.value)}
					/>
					<Input
						label="Historical Yield Year"
						value={histYieldYear}
						onChange={(e) => setHistYieldYear(e.target.value)}
					/>
				</div>

				{/* HEALTH STATUS */}
				<div className="grid grid-cols-2 gap-2 mb-3">
					{HealthStatusOptions.map((stat) => (
						<label
							key={stat.value}
							className="rounded-lg p-2 group transition-all cursor-pointer border-2 border-transparent bg-(--stat-bg) has-[input:checked]:bg-[#a6a3a3]/20 has-[input:checked]:border-2 has-[input:checked]:border-[#a6a3a3]"
							style={
								{
									boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
									"--stat-bg": `${stat.color}33`,
								} as React.CSSProperties
							}>
							<div className="flex justify-center items-center">
								<input
									type="radio"
									name="healthStatus"
									className="hidden"
									checked={healthStatus === stat.value}
									onChange={() => setHealthStatus(stat.value)}
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

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				<Button
					buttonType="submit"
					label={submitting ? "Adding..." : "Add"}
					disabled={submitting}
				/>
			</form>
		</ModalContainer>
	);
};

// ─────────────────────────────────────────────
// MONITOR HEALTH — takes `hive` as a real prop
// ─────────────────────────────────────────────
export type HiveTargetSummary = {
	hiveId: string;
	hiveName: string;
	beeSpecies: string;
	dateEstablished: string;
};

type HiveScopedModalProps = ModalProps & {
	hive?: HiveTargetSummary | null;
};

export const MonitorHealth = ({ isOpen, onClose, onConfirm, hive }: HiveScopedModalProps) => {
	const [activityDate, setActivityDate] = useState("");
	const [observation, setObservation] = useState<InspectionObservation | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setActivityDate("");
			setObservation(null);
			setErrorMsg(null);
		}
	}, [isOpen, hive?.hiveId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);

		if (!hive) {
			setErrorMsg("No hive selected.");
			return;
		}
		if (!observation) {
			setErrorMsg("Please select a physical inspection observation.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await hiveService.recordInspection(hive.hiveId, {
				observation,
				activity_date: activityDate || null,
			});

			if (!res.success) {
				setErrorMsg(
					res.errors && res.errors.length > 0
						? res.errors.join(", ")
						: res.message,
				);
				setSubmitting(false);
				return;
			}

			setSubmitting(false);
			onConfirm?.();
			onClose();
		} catch {
			setErrorMsg("Network error. Please try again.");
			setSubmitting(false);
		}
	};

	return (
		<ModalContainer
			open={isOpen}
			width="w-1/3"
			header="Monitor Hive Health"
			onClose={onClose}>
			<form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
				<Input label="Hive Name" value={hive?.hiveName ?? ""} disabled />
				<Input label="Bee Species" value={hive?.beeSpecies ?? ""} disabled />
				<Input
					label="Activity Date"
					type="date"
					value={activityDate}
					onChange={(e) => setActivityDate(e.target.value)}
				/>

				<label className="lg:text-base text-xs text-black">
					Physical Inspection
				</label>
				<div className="grid grid-cols-2 gap-2 mb-3">
					{PhysicalInspectionOptions.map((label) => (
						<label
							key={label}
							className="rounded-lg p-2 group transition-all cursor-pointer border-2 border-transparent has-[input:checked]:bg-[#a6a3a3]/20 has-[input:checked]:border-2 has-[input:checked]:border-[#a6a3a3]"
							style={{ boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px" }}>
							<div className="flex justify-start items-center gap-2">
								<input
									type="radio"
									name="healthStatus"
									className="hidden"
									checked={observation === label}
									onChange={() => setObservation(label)}
								/>
								<div className="w-4.25 h-4.25 rounded-sm border border-[#a6a3a3]">
									<Icon
										icon="iconamoon:check-bold"
										className="hidden w-full h-full text-[#4A2F00] group-has-[input:checked]:block"
									/>
								</div>
								<span className="Poppins-SemiBold text-xs">{label}</span>
							</div>
						</label>
					))}
				</div>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				<Button
					buttonType="submit"
					label={submitting ? "Logging..." : "Log Maintenance"}
					disabled={submitting}
				/>
			</form>
		</ModalContainer>
	);
};

// ─────────────────────────────────────────────
// ADD YIELD — takes `hive` as a real prop
// ─────────────────────────────────────────────
export const AddYield = ({ isOpen, onClose, onConfirm, hive }: HiveScopedModalProps) => {
	const [harvestDate, setHarvestDate] = useState("");
	const [yieldKg, setYieldKg] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setHarvestDate("");
			setYieldKg("");
			setErrorMsg(null);
		}
	}, [isOpen, hive?.hiveId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);

		if (!hive) {
			setErrorMsg("No hive selected.");
			return;
		}
		const kg = parseFloat(yieldKg);
		if (Number.isNaN(kg) || kg < 0) {
			setErrorMsg("Please enter a valid yield amount.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await yieldService.addHarvest(hive.hiveId, {
				yield_kg: kg,
				yield_date: harvestDate || null,
			});

			if (!res.success) {
				setErrorMsg(
					res.errors && res.errors.length > 0
						? res.errors.join(", ")
						: res.message,
				);
				setSubmitting(false);
				return;
			}

			setSubmitting(false);
			onConfirm?.();
			onClose();
		} catch {
			setErrorMsg("Network error. Please try again.");
			setSubmitting(false);
		}
	};

	return (
		<ModalContainer
			open={isOpen}
			width="w-1/4"
			header="Add Yield"
			onClose={onClose}>
			<form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
				<Input label="Hive Name" value={hive?.hiveName ?? ""} disabled />
				<Input label="Bee Species" value={hive?.beeSpecies ?? ""} disabled />
				<Input
					label="Date Established"
					value={hive?.dateEstablished ?? ""}
					disabled
				/>
				<Input
					label="Harvest Date"
					type="date"
					value={harvestDate}
					onChange={(e) => setHarvestDate(e.target.value)}
				/>
				<Input
					label="Total Yield (kg)"
					value={yieldKg}
					onChange={(e) => setYieldKg(e.target.value)}
				/>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				<div className="mt-3">
					<Button
						buttonType="submit"
						label={submitting ? "Saving..." : "Add"}
						disabled={submitting}
					/>
				</div>
			</form>
		</ModalContainer>
	);
};

// ─────────────────────────────────────────────
// VIEW HISTORY
// ─────────────────────────────────────────────
type ViewHistoryProps = ModalProps & {
	hiveSummary?: {
		hiveId: string;
		hive: string;
		species: string;
		status: "healthy" | "weak" | "need attention" | "diseased";
		hiveState: string;
	};
};

export const ViewHistory = ({ isOpen, onClose, hiveSummary }: ViewHistoryProps) => {
	const [activeTab, setActiveTab] = useState<"monitoring" | "harvest">("monitoring");
	const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
	const [harvests, setHarvests] = useState<YieldRecord[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!isOpen || !hiveSummary?.hiveId) return;
		let cancelled = false;

		const load = async () => {
			setLoading(true);
			const [maintRes, yieldRes] = await Promise.all([
				hiveService.listMaintenance(hiveSummary.hiveId),
				yieldService.listHistory(hiveSummary.hiveId),
			]);
			if (cancelled) return;
			if (maintRes.success && maintRes.data) setMaintenance(maintRes.data);
			if (yieldRes.success && yieldRes.data) setHarvests(yieldRes.data);
			setLoading(false);
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [isOpen, hiveSummary?.hiveId]);

	const monitoringEntries: HistoryEntry[] = maintenance.map((m) => ({
		date: m.activity_date,
		status: m.remarks || m.activity_type,
	}));
	const harvestEntries: HistoryEntry[] = harvests
		.filter((h) => !h.is_baseline)
		.map((h) => ({ date: h.yield_date, yield: `${h.yield_kg.toFixed(2)}kg` }));

	const grouped: Record<string, HistoryEntry[]> = groupByMonth(
		activeTab === "monitoring" ? monitoringEntries : harvestEntries,
	);

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
						activeTab === "monitoring" ? "bg-[#FFC700]" : "bg-[#e2e2e6]"
					}`}>
					Monitoring
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("harvest")}
					className={`Poppins-SemiBold w-full p-2 rounded-lg ${
						activeTab === "harvest" ? "bg-[#FFC700]" : "bg-[#e2e2e6]"
					}`}>
					Harvest
				</button>
			</div>

			{hiveSummary && (
				<HiveTrans
					hiveId={hiveSummary.hiveId}
					hive={hiveSummary.hive}
					location={hiveSummary.species}
					lastCheck=""
					status={hiveSummary.status}
					hiveState={hiveSummary.hiveState}
				/>
			)}

			<div className="border-2 border-[#e2e2e6] rounded-xl p-2 flex-1 flex flex-col gap-5 overflow-y-auto overflow-x-hidden min-h-0">
				{loading ? (
					<p className="text-center text-sm text-[#817b70] p-4">Loading...</p>
				) : Object.keys(grouped).length === 0 ? (
					<p className="text-center text-sm text-[#817b70] p-4">
						No {activeTab === "monitoring" ? "monitoring" : "harvest"} records yet.
					</p>
				) : (
					<table className="w-full border-collapse">
						<tbody>
							{Object.entries(grouped).map(([month, entries]) => (
								<React.Fragment key={month}>
									<tr className="border-b border-[#e0e0e0]">
										<td
											colSpan={2}
											className="Poppins-Bold text-sm px-4 py-3 uppercase text-[#4A2F00]">
											{month}
										</td>
									</tr>
									{entries.map((entry, idx) => (
										<tr
											key={`${month}-${idx}`}
											className="border-b border-[#e0e0e0] last:border-b-0">
											<td className="px-4 py-3 text-sm text-center text-[#6b6b6b]">
												{entry.date}
											</td>
											<td className="px-4 py-3 text-sm text-center text-[#6b6b6b]">
												{activeTab === "monitoring" ? entry.status : entry.yield}
											</td>
										</tr>
									))}
								</React.Fragment>
							))}
						</tbody>
					</table>
				)}
			</div>
		</ModalContainer>
	);
};

// ─────────────────────────────────────────────
// QUEEN REPLACE — takes `hiveId` as a real prop
// ─────────────────────────────────────────────
type QueenReplaceProps = ModalProps & {
	hiveId?: string | null;
};

export const QueenReplace = ({ isOpen, onClose, onConfirm, hiveId }: QueenReplaceProps) => {
	const [replacementDate, setReplacementDate] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setReplacementDate("");
			setErrorMsg(null);
		}
	}, [isOpen, hiveId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);

		if (!hiveId) {
			setErrorMsg("No hive selected.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await queenService.confirmReplacement(
				hiveId,
				replacementDate || null,
			);

			if (!res.success) {
				setErrorMsg(res.message);
				setSubmitting(false);
				return;
			}

			setSubmitting(false);
			onConfirm?.();
			onClose();
		} catch {
			setErrorMsg("Network error. Please try again.");
			setSubmitting(false);
		}
	};

	return (
		<ModalContainer
			open={isOpen}
			width="w-1/4"
			header="Replace the Queen Bee"
			onClose={onClose}>
			<form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
				<Input
					label="Date of Replacement"
					type="date"
					value={replacementDate}
					onChange={(e) => setReplacementDate(e.target.value)}
				/>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				<div className="mt-3">
					<Button
						buttonType="submit"
						label={submitting ? "Replacing..." : "Replace"}
						disabled={submitting}
					/>
				</div>
			</form>
		</ModalContainer>
	);
};