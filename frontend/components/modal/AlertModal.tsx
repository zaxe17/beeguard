// components/modal/AlertModal.tsx

"use client";
import { ModalContainer } from "./Modal";
import dynamic from "next/dynamic";
import { Button, CancelButton } from "../ui/Button";
import { Input, RangeInput, Select } from "../ui/Input";
import { useState } from "react";
import pesticides from "@/data/typesOfPesticide.json";
import { pesticideService, PesticideType } from "@/services/pesticide";

// Leaflet touches `window` at module-evaluation time, so it can't be
// server-rendered — load it client-side only. AddAlert stays mounted
// in the layout even when closed, so a static import would still
// break SSR for every /beekeeper/* route.
const Map = dynamic(() => import("../ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

type AddAlertProps = {
	open: boolean;
	onClose: () => void;
	onConfirm?: () => void;
};

const OTHERS_VALUE = "others";

// Mirrors the backend's RADIUS_KM_BY_TYPE in pesticide_service.py —
// keep these two in sync if the defaults ever change there.
const RADIUS_KM_BY_TYPE: Record<string, number> = {
	Insecticide: 5,
	Herbicide: 3,
	Fungicide: 3,
};
const DEFAULT_RADIUS_KM = 3;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 5;

// Broadcast so any screen listing alerts (dashboard, alert pages) can
// refetch immediately after a new one is published — same pattern as
// HIVES_CHANGED_EVENT in HivesModal.tsx.
export const ALERTS_CHANGED_EVENT = "beeguard:alerts-changed";

function notifyAlertsChanged() {
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT));
	}
}

type LatLng = { lat: number; lng: number };

export const AddAlert = ({ open, onClose, onConfirm }: AddAlertProps) => {
	const [selectedPesticide, setSelectedPesticide] = useState("");
	const [otherPesticide, setOtherPesticide] = useState("");
	const [scheduledDate, setScheduledDate] = useState("");

	// Radius is controlled state so it can auto-update when the
	// pesticide type changes, and so the map can read its current
	// value to draw the live radius circle.
	const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
	// Tracks whether the admin has manually dragged the slider — once
	// they have, picking a different pesticide type no longer
	// overwrites their manual choice.
	const [radiusManuallySet, setRadiusManuallySet] = useState(false);

	const [coords, setCoords] = useState<LatLng | null>(null);

	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const pesticideOptions = [
		...pesticides.map((cs: { name: string; code: string }) => ({
			label: cs.name,
			value: cs.code,
		})),
		{ label: "Others", value: OTHERS_VALUE },
	];

	const resetForm = () => {
		setSelectedPesticide("");
		setOtherPesticide("");
		setScheduledDate("");
		setRadiusKm(DEFAULT_RADIUS_KM);
		setRadiusManuallySet(false);
		setCoords(null);
		setErrorMsg(null);
	};

	const handlePesticideChange = (code: string) => {
		setSelectedPesticide(code);
		if (!radiusManuallySet) {
			const defaultForType = RADIUS_KM_BY_TYPE[code] ?? DEFAULT_RADIUS_KM;
			setRadiusKm(
				Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, defaultForType)),
			);
		}
	};

	const handleRadiusChange = (value: number) => {
		setRadiusManuallySet(true);
		setRadiusKm(value);
	};

	const handleSubmit = async () => {
		setErrorMsg(null);

		if (!coords) {
			setErrorMsg("Please tap the map to pin the affected location.");
			return;
		}
		if (!scheduledDate) {
			setErrorMsg("Please set the scheduled date and time.");
			return;
		}
		if (selectedPesticide === OTHERS_VALUE && !otherPesticide.trim()) {
			setErrorMsg("Please enter the pesticide name.");
			return;
		}

		// Backend's pesticide_type enum only accepts Insecticide /
		// Herbicide / Fungicide — a custom "Others" name has nowhere
		// to go there, so it stays null and the name is folded into
		// the auto-generated title instead so it isn't lost.
		const isOthers = selectedPesticide === OTHERS_VALUE;
		const pesticideType = isOthers
			? null
			: (selectedPesticide as PesticideType) || null;
		const pesticideLabel = isOthers
			? otherPesticide.trim()
			: selectedPesticide || "Pesticide";

		// No title field in this form — auto-generate one from what's
		// already here, since the backend requires a title but the
		// modal itself never asked for one.
		const autoTitle = `${pesticideLabel} Application`;

		setSubmitting(true);
		try {
			const res = await pesticideService.createAlert({
				title: autoTitle,
				pesticide_type: pesticideType,
				latitude: coords.lat,
				longitude: coords.lng,
				scheduled_date: new Date(scheduledDate).toISOString(),
				danger_radius_km: radiusKm,
				// risk_level and affected_area aren't in this form —
				// omit them and let the backend apply its own defaults
				// (risk_level defaults to "Medium", affected_area to null).
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
			resetForm();
			notifyAlertsChanged();
			onConfirm?.();
			onClose();
		} catch {
			setErrorMsg("Network error. Please try again.");
			setSubmitting(false);
		}
	};

	return (
		<ModalContainer
			open={open}
			width="w-1/3"
			header="Add New Hive"
			onClose={onClose}>
			{/* MAP — shows the selected point and a live radius circle
			    that updates as the slider or pesticide type changes. */}
			<div className="w-full h-60 rounded-xl relative overflow-hidden">
				<Map
					onLocationSelect={setCoords}
					initialMarker={coords}
					radiusKm={radiusKm}
				/>
			</div>
			<div className="flex flex-col gap-3">
				<h2 className="Poppins-SemiBold text-[#817b70]">
					Alert Information
				</h2>

				<RangeInput
					label="Danger Radius"
					min={MIN_RADIUS_KM}
					max={MAX_RADIUS_KM}
					unit="km"
					value={radiusKm}
					onChange={handleRadiusChange}
				/>

				{/* SELECT PESTICIDE TYPE */}
				<Select
					label="Select Pesticide"
					options={pesticideOptions}
					value={selectedPesticide}
					onSelectChange={(e) => handlePesticideChange(e.target.value)}
				/>

				{/* IF SELECTED OTHERS SHOW INPUT */}
				{selectedPesticide === OTHERS_VALUE && (
					<Input
						placeholder="Enter pesticide name"
						value={otherPesticide}
						onChange={(e) => setOtherPesticide(e.target.value)}
					/>
				)}

				{/* PESTICIDE SCHEDULE DATE */}
				<Input
					label="Scheduled Date & Time"
					type="datetime-local"
					value={scheduledDate}
					onChange={(e) => setScheduledDate(e.target.value)}
				/>

				{errorMsg && (
					<p className="text-xs text-red-600">{errorMsg}</p>
				)}

				{/* BUTTONS */}
				<div className="flex items-center gap-3 w-full">
					<CancelButton onClick={onClose} disabled={submitting} />
					<Button
						buttonType="button"
						label={submitting ? "Publishing..." : "Publish Alert"}
						onClick={handleSubmit}
						disabled={submitting}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};

// Default export too, in case any file imports it as default —
// keeps both import styles working without another build error.
export default AddAlert;