// components/modal/AlertModal.tsx

"use client";
import { ModalContainer } from "./Modal";
import dynamic from "next/dynamic";
import { Button, CancelButton } from "../ui/Button";
import { Input, RangeInput, Select } from "../ui/Input";
import { useEffect, useState } from "react";
import pesticides from "@/data/typesOfPesticide.json";
import { pesticideService, PesticideType } from "@/services/pesticide";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { Icon } from "@iconify/react";

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

// The backend only accepts these three pesticide types (see
// validators/pesticide_validator.py). Anything else from the dropdown
// used to be sent as-is and the alert was refused ("pesticide_type must
// be one of ..."). Now any other choice is sent as "no type" and its
// name goes into the alert title instead.
const BACKEND_PESTICIDE_TYPES = new Set(["Insecticide", "Herbicide", "Fungicide"]);

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

// "Use current location" — why the phone/browser couldn't give it.
const geoErrorMessage = (err: unknown) => {
	if (typeof window !== "undefined" && !window.isSecureContext) {
		return "Current location only works on https:// or localhost. Tap the map instead.";
	}
	const code = (err as GeolocationPositionError)?.code;
	if (code === 1) {
		return "Location permission was denied. Allow it in your browser's site settings, or tap the map instead.";
	}
	if (code === 3) return "Getting your location took too long. Try again or tap the map.";
	return "Couldn't get your location. Tap the map to pin it instead.";
};

export const AddAlert = ({ open, onClose, onConfirm }: AddAlertProps) => {
	// Beekeepers' alerts wait for admin approval; admins' go out right away.
	const { user } = useAuth();
	const needsApproval = user?.role === "beekeeper";
	// Shows the "sent for approval" message after a beekeeper submits.
	const [submittedForReview, setSubmittedForReview] = useState(false);

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
	// "Use current location" button
	const [locating, setLocating] = useState(false);

	const handleUseCurrentLocation = () => {
		if (locating) return;
		setErrorMsg(null);
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setErrorMsg("This browser can't get your location. Tap the map instead.");
			return;
		}
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				// Moves the pin (and its radius circle) there; the map flies to it.
				setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				setLocating(false);
			},
			(err) => {
				setErrorMsg(geoErrorMessage(err));
				setLocating(false);
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
		);
	};

	// NEW — the current beekeeper's own farm location, fetched from
	// their profile so the map opens centered on THEIR farm instead
	// of always defaulting to a fixed spot in Quezon City
	// (Map.tsx's DEFAULT_CENTER). Stays `null` (falls back to that
	// default) if they never set a location, or if the fetch fails.
	const [ownLocation, setOwnLocation] = useState<LatLng | null>(null);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		authService.me().then((res) => {
			if (cancelled) return;
			if (
				res.success &&
				res.data &&
				res.data.latitude != null &&
				res.data.longitude != null
			) {
				setOwnLocation({
					lat: res.data.latitude,
					lng: res.data.longitude,
				});
			}
		});
		return () => {
			cancelled = true;
		};
	}, [open]);

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
		setLocating(false);
		setErrorMsg(null);
	};

	const handlePesticideChange = (code: string) => {
		setSelectedPesticide(code);
		if (!radiusManuallySet) {
			const defaultForType = RADIUS_KM_BY_TYPE[code] ?? DEFAULT_RADIUS_KM;
			setRadiusKm(
				Math.min(
					MAX_RADIUS_KM,
					Math.max(MIN_RADIUS_KM, defaultForType),
				),
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
			setErrorMsg(
				"Please tap the map or use your current location to pin the affected area.",
			);
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
		const pesticideType =
			!isOthers && BACKEND_PESTICIDE_TYPES.has(selectedPesticide)
				? (selectedPesticide as PesticideType)
				: null;
		const pesticideLabel = isOthers
			? otherPesticide.trim()
			: pesticideOptions.find((o) => o.value === selectedPesticide)?.label ||
				selectedPesticide ||
				"Pesticide";

		// No title field in this form — auto-generate one from what's
		// already here, since the backend requires a title but the
		// modal itself never asked for one.
		// Backend limit: title max 50 characters.
		const autoTitle = `${pesticideLabel} Application`.slice(0, 50);

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
			if (res.data?.approval_status === "Pending") {
				// Keep the modal open to tell them it's waiting for the admin.
				setSubmittedForReview(true);
				return;
			}
			onClose();
		} catch {
			setErrorMsg("Network error. Please try again.");
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		setSubmittedForReview(false);
		onClose();
	};

	if (submittedForReview) {
		return (
			<ModalContainer
				open={open}
				width="lg:w-1/3 w-full"
				header="Alert Submitted"
				onClose={handleClose}>
				<div className="flex flex-col items-center text-center gap-3 py-4">
					<div className="w-16 h-16 rounded-full bg-[#ffdb4f]/40 flex items-center justify-center text-3xl">
						⏳
					</div>
					<h2 className="Poppins-SemiBold text-[#4a2f00]">
						Waiting for admin approval
					</h2>
					<p className="text-sm text-[#817b70]">
						Your alert was sent to the admin. It will be shown to other
						beekeepers once it&apos;s approved. We&apos;ll notify you either way.
					</p>
					<Button buttonType="button" label="OK" onClick={handleClose} />
				</div>
			</ModalContainer>
		);
	}

	return (
		<ModalContainer
			open={open}
			width="lg:w-1/3 w-full"
			header="Add New Alert"
			onClose={handleClose}>
			{/* MAP — shows the selected point and a live radius circle
			    that updates as the slider or pesticide type changes. */}
			<div className="w-full h-60 rounded-xl relative overflow-hidden">
				<Map
					key={
						ownLocation
							? `${ownLocation.lat},${ownLocation.lng}`
							: "default-center"
					}
					onLocationSelect={setCoords}
					initialCenter={ownLocation ?? undefined}
					// Controlled pin: tapping the map OR "Use current
					// location" both move it.
					markerPosition={coords}
					radiusKm={radiusKm}
				/>

				{/* USE CURRENT LOCATION — pins where the admin/beekeeper
				    is standing right now (e.g. at the spraying site). */}
				<button
					type="button"
					onClick={handleUseCurrentLocation}
					disabled={locating || submitting}
					className="absolute top-2 right-2 z-1000 flex items-center gap-1.5 bg-white hover:bg-[#fff8e1] text-[#4a2f00] text-xs Poppins-SemiBold py-1.5 px-3 rounded-full shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] cursor-pointer disabled:opacity-60">
					<Icon
						icon={locating ? "svg-spinners:ring-resize" : "mdi:crosshairs-gps"}
						className="w-4 h-4 text-[#ffa004]"
					/>
					{locating ? "Locating…" : "Use current location"}
				</button>
			</div>
			<p className="text-[11px] text-[#817b70] -mt-1">
				Tap the map to pin the spraying area, or use your current location.
			</p>
			<div className="flex flex-col gap-3">
				<h2 className="Poppins-SemiBold text-[#817b70]">
					Alert Information
				</h2>

				{needsApproval && (
					<p className="text-xs text-[#854F0B] bg-[#FAEEDA] rounded-md p-2">
						An admin will review your alert before other beekeepers can
						see it.
					</p>
				)}

				{/* SELECT PESTICIDE TYPE */}
				<Select
					label="Select Pesticide"
					options={pesticideOptions}
					value={selectedPesticide}
					onSelectChange={(e) =>
						handlePesticideChange(e.target.value)
					}
				/>

				{/* IF SELECTED OTHERS SHOW INPUT */}
				{selectedPesticide === OTHERS_VALUE && (
					<Input
						placeholder="Enter pesticide name"
						value={otherPesticide}
						onChange={(e) => setOtherPesticide(e.target.value)}
					/>
				)}
				
				<RangeInput
					label="Danger Radius"
					min={MIN_RADIUS_KM}
					max={MAX_RADIUS_KM}
					unit="km"
					value={radiusKm}
					onChange={handleRadiusChange}
				/>

				{/* PESTICIDE SCHEDULE DATE */}
				<Input
					label="Scheduled Date & Time"
					type="datetime-local"
					value={scheduledDate}
					onChange={(e) => setScheduledDate(e.target.value)}
				/>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				{/* BUTTONS */}
				<div className="flex items-center gap-3 w-full">
					<CancelButton onClick={handleClose} disabled={submitting} />
					<Button
						buttonType="button"
						label={
							submitting
								? needsApproval
									? "Submitting..."
									: "Publishing..."
								: needsApproval
									? "Submit for Approval"
									: "Publish Alert"
						}
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