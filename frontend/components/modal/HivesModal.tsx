// HivesModal.tsx

"use client";

import { Icon } from "@iconify/react";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/Input";
import { Button, CancelButton } from "../ui/Button";
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

import bee_report from "@/public/assets/bee_report.png";
import Image from "next/image";

type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm?: () => void; // called after a successful action, in addition to the built-in close
};

const HealthStatusOptions: {
	label: string;
	value: HealthStatus;
	color: string;
}[] = [
	{ label: "Healthy", value: "Healthy", color: "#009900" },
	{ label: "Weak", value: "Weak", color: "#e6c347" },
	{ label: "Needs Attention", value: "Needs Attention", color: "#d9822a" },
	{ label: "Diseased", value: "Diseased", color: "#cc0000" },
];

// NORMAL_LABEL is mutually exclusive with the other three — checking
// it clears any symptom checkboxes, and checking any symptom clears it.
const NORMAL_LABEL: InspectionObservation = "Normal / Healthy";
const SymptomOptions: InspectionObservation[] = [
	"Presence of Queen Cells",
	"Reduction of Open Brood",
	"Emaciated Queen",
];
const PhysicalInspectionOptions: InspectionObservation[] = [
	NORMAL_LABEL,
	...SymptomOptions,
];

// ── Shared "hives changed" signal ──────────────────────────
// Dispatched after ANY successful create/update that affects hive
// data, yields, or recommendations. Any screen (Hives list,
// Dashboard, History) can listen for this and refetch immediately
// instead of requiring a manual page refresh.
export const HIVES_CHANGED_EVENT = "beeguard:hives-changed";

function notifyHivesChanged() {
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(HIVES_CHANGED_EVENT));
	}
}

// ── Shared history-entry shape ────────────────
type HistoryEntry = {
	date: string;
	status?: string;
	yield?: string;
};

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
			setErrorMsg(
				"Hive name, bee species, and date established are required.",
			);
			return;
		}

		const hasKg = histYieldKg.trim() !== "";
		const hasYear = histYieldYear.trim() !== "";
		if (hasKg !== hasYear) {
			setErrorMsg(
				"Provide both historical yield and year, or leave both blank.",
			);
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
				historical_yield_year: hasYear
					? parseInt(histYieldYear, 10)
					: null,
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

			// NEW: broadcast so Hives list / Dashboard / History refetch
			// immediately without needing a manual page reload.
			notifyHivesChanged();

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
			<form
				onSubmit={handleSubmit}
				className="w-full flex flex-col gap-3">
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

export const MonitorHealth = ({
	isOpen,
	onClose,
	onConfirm,
	hive,
}: HiveScopedModalProps) => {
	const [activityDate, setActivityDate] = useState("");
	// NEW: multi-select — replaces the old single `observation` state.
	const [observations, setObservations] = useState<InspectionObservation[]>(
		[],
	);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setActivityDate("");
			setObservations([]);
			setErrorMsg(null);
		}
	}, [isOpen, hive?.hiveId]);

	// Toggling "Normal / Healthy" clears any symptom checkboxes (they're
	// mutually exclusive). Toggling any symptom clears "Normal / Healthy"
	// if it was checked, and otherwise adds/removes that one symptom —
	// so up to all 3 symptoms can be checked together.
	const toggleObservation = (label: InspectionObservation) => {
		setObservations((prev) => {
			const isChecked = prev.includes(label);

			if (label === NORMAL_LABEL) {
				return isChecked ? [] : [NORMAL_LABEL];
			}

			// Checking a symptom always clears "Normal / Healthy" first.
			const withoutNormal = prev.filter((o) => o !== NORMAL_LABEL);
			if (isChecked) {
				return withoutNormal.filter((o) => o !== label);
			}
			return [...withoutNormal, label];
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);

		if (!hive) {
			setErrorMsg("No hive selected.");
			return;
		}
		if (observations.length === 0) {
			setErrorMsg("Please select at least one physical inspection observation.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await hiveService.recordInspection(hive.hiveId, {
				observations,
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

			// NEW: health_status + recommendation may have changed —
			// refresh any screen listening.
			notifyHivesChanged();

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
			<form
				onSubmit={handleSubmit}
				className="w-full flex flex-col gap-3">
				<Input
					label="Hive Name"
					value={hive?.hiveName ?? ""}
					disabled
				/>
				<Input
					label="Bee Species"
					value={hive?.beeSpecies ?? ""}
					disabled
				/>
				<Input
					label="Activity Date"
					type="date"
					value={activityDate}
					onChange={(e) => setActivityDate(e.target.value)}
				/>

				<label className="lg:text-base text-xs text-black">
					Physical Inspection
				</label>
				<p className="text-[10px] text-[#817b70] -mt-2">
					Select all that apply. 1 symptom → Needs Attention · 2–3
					symptoms → Weak.
				</p>
				<div className="grid grid-cols-2 gap-2 mb-3">
					{PhysicalInspectionOptions.map((label) => {
						const checked = observations.includes(label);
						return (
							<label
								key={label}
								className="rounded-lg p-2 group transition-all cursor-pointer border-2 border-transparent has-[input:checked]:bg-[#a6a3a3]/20 has-[input:checked]:border-2 has-[input:checked]:border-[#a6a3a3]"
								style={{
									boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
								}}>
								<div className="flex justify-start items-center gap-2">
									<input
										type="checkbox"
										name="observations"
										className="hidden"
										checked={checked}
										onChange={() => toggleObservation(label)}
									/>
									<div className="w-4.25 h-4.25 rounded-sm border border-[#a6a3a3]">
										<Icon
											icon="iconamoon:check-bold"
											className="hidden w-full h-full text-[#4A2F00] group-has-[input:checked]:block"
										/>
									</div>
									<span className="Poppins-SemiBold text-xs">
										{label}
									</span>
								</div>
							</label>
						);
					})}
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
export const AddYield = ({
	isOpen,
	onClose,
	onConfirm,
	hive,
}: HiveScopedModalProps) => {
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

			// NEW: new harvest affects Dashboard tiles, yield trend, and
			// possibly a queen recommendation — refresh everywhere.
			notifyHivesChanged();

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
			<form
				onSubmit={handleSubmit}
				className="w-full flex flex-col gap-3">
				<Input
					label="Hive Name"
					value={hive?.hiveName ?? ""}
					disabled
				/>
				<Input
					label="Bee Species"
					value={hive?.beeSpecies ?? ""}
					disabled
				/>
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

export const ViewHistory = ({
	isOpen,
	onClose,
	hiveSummary,
}: ViewHistoryProps) => {
	const [activeTab, setActiveTab] = useState<"monitoring" | "harvest">(
		"monitoring",
	);
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
			if (maintRes.success && maintRes.data)
				setMaintenance(maintRes.data);
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
		.map((h) => ({
			date: h.yield_date,
			yield: `${h.yield_kg.toFixed(2)}kg`,
		}));

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
					<p className="text-center text-sm text-[#817b70] p-4">
						Loading...
					</p>
				) : Object.keys(grouped).length === 0 ? (
					<p className="text-center text-sm text-[#817b70] p-4">
						No{" "}
						{activeTab === "monitoring" ? "monitoring" : "harvest"}{" "}
						records yet.
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
												{activeTab === "monitoring"
													? entry.status
													: entry.yield}
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

export const QueenReplace = ({
	isOpen,
	onClose,
	onConfirm,
	hiveId,
}: QueenReplaceProps) => {
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

			// NEW: queen_installed_date + recommendation state changed.
			notifyHivesChanged();

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
			<form
				onSubmit={handleSubmit}
				className="w-full flex flex-col gap-3">
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

// ─────────────────────────────────────────────
// QUEEN ALERT POPUP — shown when a tapped hive's health status
// is Needs Attention / Weak / Diseased. Fully prop-driven now:
// the parent screen decides WHEN to open it and WHICH hive it's
// for (see `page.tsx`), instead of the old hardcoded/hidden logic.
// ─────────────────────────────────────────────
type BeeQueenModalHive = {
	hiveId: string;
	hiveName: string;
	healthStatus: HealthStatus;
};

type BeeQueenModalProps = ModalProps & {
	hive?: BeeQueenModalHive | null;
	onReplaceQueen?: () => void;
};

const QUEEN_ALERT_TEXT: Partial<Record<HealthStatus, { title: string; message: string }>> = {
	"Needs Attention": {
		title: "QUEEN BEE NEEDS ATTENTION",
		message: "Consider replacing the queen bee for a more productive colony.",
	},
	Weak: {
		title: "HIVE IS WEAK",
		message: "This hive is weakening. Consider replacing the queen bee.",
	},
	Diseased: {
		title: "HIVE IS DISEASED",
		message: "This hive shows signs of disease. Consider replacing the queen bee.",
	},
};

export const BeeQueenModal = ({
	isOpen,
	onClose,
	hive,
	onReplaceQueen,
}: BeeQueenModalProps) => {
	if (!isOpen || !hive) return null;

	const alertText =
		QUEEN_ALERT_TEXT[hive.healthStatus] ??
		QUEEN_ALERT_TEXT["Needs Attention"]!;

	return (
		<div
			className="fixed inset-0 w-full h-full bg-black/50 z-50 flex justify-center items-center"
			onClick={onClose}>
			<div
				className="w-1/4 min-w-[320px] bg-[#fefefd] rounded-3xl border-2 border-[#a6a3a3] border-solid p-5"
				onClick={(e) => e.stopPropagation()}>
				<div className="flex flex-col items-center text-center">
					<h2 className="Poppins-Bold text-[#db4b44] text-4xl uppercase">
						{hive.hiveName}
					</h2>

					<p className="Poppins-Bold text-xl uppercase">
						{alertText.title}
					</p>

					<div className="w-full flex justify-center items-center my-4">
						<Image
							src={bee_report}
							alt="bee_report"
							className="w-48 h-w-48"
						/>
					</div>

					<p className="text-base mb-3">{alertText.message}</p>

					<div className="flex items-center gap-3 w-full">
						<CancelButton onClick={onClose} />
						<Button
							buttonType="button"
							label="Replace Queen"
							onClick={onReplaceQueen}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};