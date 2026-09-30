// HivesModal.tsx

"use client";

import { Icon } from "@iconify/react";
import React, { useEffect, useRef, useState } from "react";
import { Input, Select } from "../ui/Input";
import { HIVE_SPECIES_OPTIONS } from "@/data/species";
import { Button, CancelButton } from "../ui/Button";
import { ModalContainer } from "./Modal";
import { HiveTrans, hiveStatusColor } from "../HiveContainer";
import {
	hiveService,
	HealthStatus,
	Hive,
	HiveState,
	InspectionObservation,
	MaintenanceRecord,
} from "@/services/hive";
import { yieldService, YieldRecord } from "@/services/harvest";
import { queenService } from "@/services/queen";
import { authService } from "@/services/auth";
import {
	formatCoords,
	parseCoords,
	reverseGeocode,
	searchPlace,
	SUBDIVISION_RE,
} from "@/services/geocode";

import bee_report from "@/public/assets/bee_report.png";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
	HistoryTableSkeleton,
	HiveTransSkeleton,
} from "../loading/SkeletonLoading";
import dynamic from "next/dynamic";

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

// Today's date on THIS device as "YYYY-MM-DD" (what <input type="date">
// uses). Not toISOString() — that's the UTC date, which is still
// "yesterday" before 8 AM in the Philippines.
const localToday = () => {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${mm}-${dd}`;
};

// "YYYY-MM-DD" strings compare correctly as plain text.
const isFutureDate = (value: string) => !!value && value > localToday();

// A saved date from the backend -> "YYYY-MM-DD" for <input type="date">.
// The backend sends "2026-04-01", "2026-04-01T00:00:00" or
// "Wed, 01 Apr 2026 00:00:00 GMT" (midnight UTC) depending on the route.
const toInputDate = (value?: string | null): string => {
	if (!value) return "";
	if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(d.getUTCDate()).padStart(2, "0");
	return `${d.getUTCFullYear()}-${mm}-${dd}`;
};

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
	// NEW — the record's id, for Delete.
	id?: string;
};

const Map = dynamic(() => import("../ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

// ─────────────────────────────────────────────
// HIVE LOCATION (NEW) — Add / Edit Hive map. Works like the citizen
// report's Location box:
//   - type a place ("Moonwalk, Parañaque") or "14.49, 121.02" -> after a
//     short pause it's searched and the pin moves there
//   - tap the map / "Use current location" -> pin + the place name is
//     filled in the Location box
// The beekeeper's other hives are shown as yellow pins.
// ─────────────────────────────────────────────
type LatLng = { lat: number; lng: number };
type LocationLookup = "idle" | "searching" | "found" | "notFound";
// Same wait as the citizen report's Location box.
const GEOCODE_DEBOUNCE_MS = 800;
type HivePin = {
	id: string;
	lat: number;
	lng: number;
	label?: string;
	color?: string;
};

// Same messages as Add Alert's "Use current location".
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

// Parts of an address that are never the barangay or the city.
const NOT_PLACE_RE =
	/^(metro manila|ncr|national capital region|philippines|\d{4})$|\bdistrict\b/i;

/**
 * Any location text -> just "Barangay, City". Drops subdivisions
 * ("Airport Village"), streets before them, districts, "Metro Manila",
 * "Philippines" and postal codes, then keeps the last two parts:
 * "Airport Village, Moonwalk, Parañaque, Metro Manila" -> "Moonwalk, Parañaque".
 */
const cleanPlace = (text: string): string => {
	const parts = text
		.split(",")
		.map((p) => p.trim())
		.filter((p) => p && !NOT_PLACE_RE.test(p));
	// Everything up to the last subdivision is street / subdivision detail.
	let lastSub = -1;
	parts.forEach((p, i) => {
		if (SUBDIVISION_RE.test(p)) lastSub = i;
	});
	const rest = parts.slice(lastSub + 1);
	return (rest.length ? rest : parts).slice(-2).join(", ");
};

const hasCoords = (h: Hive) =>
	h.latitude != null &&
	h.longitude != null &&
	!Number.isNaN(Number(h.latitude)) &&
	!Number.isNaN(Number(h.longitude));

/**
 * Everything the Add / Edit Hive forms need for the location:
 * the pin, the Location text, the other hives' pins and where the map
 * starts. `excludeHiveId` leaves the hive being edited out of the pins
 * (it's the main pin instead).
 */
const useHiveLocation = (isOpen: boolean, excludeHiveId?: string | null) => {
	const [coords, setCoords] = useState<LatLng | null>(null);
	// The saved pin when the form opened (Edit) — where the map starts.
	const [savedCoords, setSavedCoords] = useState<LatLng | null>(null);
	const [location, setLocation] = useState("");
	// "Barangay, City" of the current pin — what gets SAVED (and shown on
	// the cards), whatever was typed to find the place.
	const [placeLabel, setPlaceLabel] = useState("");
	const [locating, setLocating] = useState(false);
	const [lookup, setLookup] = useState<LocationLookup>("idle");
	const [geoError, setGeoError] = useState<string | null>(null);
	const [hivePins, setHivePins] = useState<HivePin[]>([]);
	const [ownLocation, setOwnLocation] = useState<LatLng | null>(null);
	const lookupId = useRef(0);
	// Text WE put in the Location box (place name from a pin, or the saved
	// one) — not searched again, so it can't move the pin away.
	const autoText = useRef<string | null>(null);

	// Other hives + the beekeeper's farm location (map start point when
	// there are no hive pins yet).
	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;
		hiveService.list().then((res) => {
			if (cancelled || !res.success || !res.data) return;
			setHivePins(
				res.data
					.filter((h) => h.hive_id !== excludeHiveId && hasCoords(h))
					.map((h) => ({
						id: h.hive_id,
						lat: Number(h.latitude),
						lng: Number(h.longitude),
						label: h.hive_name,
						color: hiveStatusColor(h.health_status),
					})),
			);
		});
		authService.me().then((res) => {
			if (cancelled) return;
			if (res.success && res.data?.latitude != null && res.data?.longitude != null) {
				setOwnLocation({ lat: res.data.latitude, lng: res.data.longitude });
			}
		});
		return () => {
			cancelled = true;
		};
	}, [isOpen, excludeHiveId]);

	// Our own text in the box (skips the search below).
	const setAutoText = (text: string) => {
		autoText.current = text;
		setLocation(text);
	};

	// Pin -> "Barangay, City" (backend place names). `fillBox` also puts
	// it in the Location box (map tap / current location).
	const lookUpLabel = (c: LatLng, fillBox: boolean) => {
		const id = ++lookupId.current;
		setPlaceLabel("");
		reverseGeocode(c.lat, c.lng).then((name) => {
			if (id !== lookupId.current) return; // a newer pin was placed
			if (!name) return;
			const clean = cleanPlace(name);
			setPlaceLabel(clean);
			if (fillBox) setAutoText(clean);
		});
	};

	// ── Typed location -> pin on the map ─────────────
	useEffect(() => {
		if (!isOpen) return;
		const text = location.trim();
		if (autoText.current !== null && location === autoText.current) return;
		autoText.current = null;

		if (text.length < 3) {
			setLookup(coords ? "found" : "idle");
			return;
		}

		// "14.49110, 121.01900" typed directly — no lookup needed.
		const typed = parseCoords(text);
		if (typed) {
			setCoords(typed);
			setLookup("found");
			lookUpLabel(typed, false);
			return;
		}

		let cancelled = false;
		setLookup("searching");
		const t = setTimeout(async () => {
			const place = await searchPlace(text);
			if (cancelled) return;
			if (place) {
				const c = { lat: place.lat, lng: place.lng };
				setCoords(c);
				setLookup("found");
				lookUpLabel(c, false);
			} else {
				setLookup("notFound");
			}
		}, GEOCODE_DEBOUNCE_MS);

		return () => {
			cancelled = true;
			clearTimeout(t);
		};
		// Only when the TEXT changes — opening the form doesn't search.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location]);

	// ── Map tap / current location -> pin + place name in the box ─
	const pick = (c: LatLng) => {
		setCoords(c);
		setGeoError(null);
		setLookup("found");
		setAutoText(formatCoords(c.lat, c.lng));
		lookUpLabel(c, true);
	};

	// Leaving the Location box -> tidy it to "Barangay, City" of the pin
	// (e.g. "SM Bicutan, Doña Soledad Ave" -> "Don Bosco, Parañaque").
	const tidyText = () => {
		if (placeLabel && lookup === "found") setAutoText(placeLabel);
	};

	// What to save: "Barangay, City" of the pin; typed text only if the
	// place name couldn't be found.
	// NEVER saves coordinates ("14.49656, 121.02713"): if the place name
	// isn't known yet it's looked up now; if it still can't be found the
	// location is left empty and the cards look the name up from the pin.
	const locationToSave = async (): Promise<string | null> => {
		if (placeLabel) return cleanPlace(placeLabel).slice(0, 100) || null;
		if (coords) {
			const name = await reverseGeocode(coords.lat, coords.lng);
			if (name) return cleanPlace(name).slice(0, 100) || null;
		}
		const typed = location.trim();
		if (!typed || parseCoords(typed)) return null;
		return cleanPlace(typed).slice(0, 100) || null;
	};

	const pickCurrentLocation = () => {
		if (locating) return;
		setGeoError(null);
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setGeoError("This browser can't get your location. Tap the map instead.");
			return;
		}
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setLocating(false);
				pick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
			},
			(err) => {
				setLocating(false);
				setGeoError(geoErrorMessage(err));
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
		);
	};

	// Set the form from a saved hive (Edit) or clear it (Add).
	const reset = (hive?: Hive | null) => {
		lookupId.current++;
		setLocating(false);
		setGeoError(null);
		const rawSaved = hive?.location ?? "";
		// An older save that's just coordinates isn't a place name.
		const savedText = parseCoords(rawSaved) ? "" : cleanPlace(rawSaved);
		setAutoText(savedText);
		setPlaceLabel(savedText);
		const savedPin =
			hive && hasCoords(hive)
				? { lat: Number(hive.latitude), lng: Number(hive.longitude) }
				: null;
		setCoords(savedPin);
		setSavedCoords(savedPin);
		setLookup(savedPin ? "found" : "idle");
	};

	// Not the live pin — placing a pin must not remount the map.
	const startCenter =
		savedCoords ??
		(hivePins[0] ? { lat: hivePins[0].lat, lng: hivePins[0].lng } : ownLocation);

	// Same hints as the citizen report's Location box.
	const hint =
		lookup === "searching"
			? "Finding that place on the map…"
			: lookup === "notFound"
				? "Couldn't find that place. Try adding the city, or tap the map to drop a pin."
				: lookup === "found"
					? "Pin placed. Tap the map to adjust it."
					: "Type a place (e.g. Moonwalk, Parañaque) or tap the map.";

	return {
		coords,
		location,
		setLocation,
		tidyText,
		locationToSave,
		locating,
		lookup,
		hint,
		geoError,
		hivePins,
		startCenter,
		pick,
		pickCurrentLocation,
		reset,
	};
};

type HiveLocationMapProps = {
	loc: ReturnType<typeof useHiveLocation>;
	disabled?: boolean;
};

// The map box itself: pin + other hives + "Use current location".
const HiveLocationMap = ({ loc, disabled }: HiveLocationMapProps) => (
	<>
		<Map
			// Leaflet only reads the start center once — remount when the
			// hives / farm location arrive so it starts in the right place.
			key={
				loc.startCenter
					? `${loc.hivePins.length}:${loc.startCenter.lat},${loc.startCenter.lng}`
					: "default-center"
			}
			onLocationSelect={loc.pick}
			initialCenter={loc.startCenter ?? undefined}
			markerPosition={loc.coords}
			hivePins={loc.hivePins}
		/>
		<button
			type="button"
			onClick={loc.pickCurrentLocation}
			disabled={loc.locating || disabled}
			className="absolute top-2 right-2 z-1000 flex items-center gap-1.5 bg-white hover:bg-[#fff8e1] text-[#4a2f00] text-xs Poppins-SemiBold py-1.5 px-3 rounded-full shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] cursor-pointer disabled:opacity-60">
			<Icon
				icon={loc.locating ? "svg-spinners:ring-resize" : "mdi:crosshairs-gps"}
				className="w-4 h-4 text-[#ffa004]"
			/>
			{loc.locating ? "Locating…" : "Use current location"}
		</button>
	</>
);

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
// BEE SPECIES BOX — type freely, or pick from a white dropdown of the
// suggested species (HIVE_SPECIES_OPTIONS). Custom-made instead of the
// browser's <datalist>, whose dropdown can't be styled (it showed dark).
// ─────────────────────────────────────────────
const SpeciesCombobox = ({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) => {
	const [open, setOpen] = useState(false);

	// Show the species that match what's typed (all of them when empty,
	// or when the text is exactly one of the options).
	const q = value.trim().toLowerCase();
	const exact = HIVE_SPECIES_OPTIONS.some((o) => o.value.toLowerCase() === q);
	const options =
		!q || exact
			? HIVE_SPECIES_OPTIONS
			: HIVE_SPECIES_OPTIONS.filter((o) =>
					o.label.toLowerCase().includes(q),
				);

	return (
		<div className="relative flex flex-col w-full gap-1">
			<label
				htmlFor="hive-bee-species"
				className="lg:text-base text-sm text-[#4a2f00]">
				Bee Species
			</label>
			<div className="relative">
				<input
					id="hive-bee-species"
					value={value}
					onChange={(e) => {
						onChange(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => setOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setOpen(false);
					}}
					placeholder="Select or type the bee species"
					maxLength={50}
					autoComplete="off"
					className="text-sm w-full lg:h-8 h-10 p-2.5 pr-8 border border-[#a6a3a3] outline-0 rounded-lg bg-white/70"
				/>
				<Icon
					icon="mdi:chevron-down"
					className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-[#817b70] pointer-events-none transition-transform ${
						open ? "rotate-180" : ""
					}`}
				/>
			</div>

			{open && options.length > 0 && (
				<ul className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[#e2e2e6] rounded-lg shadow-[0px_6px_16px_rgba(0,0,0,0.15)] max-h-64 overflow-y-auto">
					{options.map((o, i) => (
						<React.Fragment key={o.value}>
							{/* group heading: "Honey Bees" / "Stingless Bees" */}
							{(i === 0 || options[i - 1].group !== o.group) && (
								<li className="sticky top-0 bg-[#f7f5ef] px-3 py-1 text-[10px] Poppins-SemiBold uppercase tracking-wide text-[#817b70]">
									{o.group}
								</li>
							)}
							<li
								// onMouseDown (not onClick) so it runs before the
								// input's blur closes the list.
								onMouseDown={(e) => {
									e.preventDefault();
									onChange(o.value);
									setOpen(false);
								}}
								className={`px-3 py-2 cursor-pointer hover:bg-[#fff1ad]/60 ${
									o.value === value ? "bg-[#fff8e1]" : ""
								}`}>
								<p className="Poppins-SemiBold text-sm text-[#4a2f00]">
									{o.value}
								</p>
								<p className="text-xs text-[#817b70]">
									{o.label}
								</p>
							</li>
						</React.Fragment>
					))}
				</ul>
			)}
		</div>
	);
};

// ─────────────────────────────────────────────
// ADD HIVE — no hive context needed (creates a new one)
// ─────────────────────────────────────────────
export const AddHiveModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
	const [hiveName, setHiveName] = useState("");
	const [beeSpecies, setBeeSpecies] = useState("");
	const [dateEstablished, setDateEstablished] = useState("");
	// NEW — when the current queen was installed. Optional: left blank,
	// the server uses Date Established. Drives the queen-age check
	// (queen too old -> "Replace Queen").
	const [queenDate, setQueenDate] = useState("");
	const [hiveState, setHiveState] = useState<HiveState>("Active");
	const [healthStatus, setHealthStatus] = useState<HealthStatus>("Healthy");
	const [histYieldKg, setHistYieldKg] = useState("");
	const [histYieldYear, setHistYieldYear] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	// NEW — map pin + Location text
	const loc = useHiveLocation(isOpen);

	const resetForm = () => {
		loc.reset();
		setHiveName("");
		setBeeSpecies("");
		setDateEstablished("");
		setQueenDate("");
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
		if (loc.lookup === "searching") {
			setErrorMsg("Still finding that place on the map — wait a moment.");
			return;
		}
		if (!loc.coords) {
			setErrorMsg(
				"Please type the location, tap the map, or use your current location to pin the hive.",
			);
			return;
		}

		if (isFutureDate(dateEstablished)) {
			setErrorMsg("Date established can't be in the future.");
			return;
		}
		if (queenDate) {
			if (isFutureDate(queenDate)) {
				setErrorMsg("Queen established date can't be in the future.");
				return;
			}
			if (queenDate < dateEstablished) {
				setErrorMsg(
					"Queen established date can't be before the hive was established.",
				);
				return;
			}
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
				location: await loc.locationToSave(), // "Barangay, City"
				latitude: loc.coords.lat,
				longitude: loc.coords.lng,
				date_established: dateEstablished,
				// blank -> server uses date_established
				queen_installed_date: queenDate || null,
				hive_state: hiveState,
				health_status: healthStatus,
				historical_yield_kg: hasKg ? parseFloat(histYieldKg) : null,
				historical_yield_year: hasYear
					? parseInt(histYieldYear, 10)
					: null,
			});

			// OFFLINE MODE — saved on the phone, sent when back online
			// (shown in the "waiting to sync" banner). Treat as done.
			if (res.queued) {
				resetForm();
				setSubmitting(false);
				onClose();
				return;
			}

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
			width=""
			height="lg:max-h-full max-h-[80vh]"
			header="Add New Hive"
			onClose={onClose}>
			<form
				onSubmit={handleSubmit}
				className="w-full flex flex-col gap-3">
				<div className="w-full flex lg:flex-row flex-col gap-3">
					{/* MAPS */}
					<div className="w-full aspect-square rounded-lg overflow-hidden relative">
						<HiveLocationMap loc={loc} disabled={submitting} />
					</div>

					<div className="w-full flex flex-col gap-3">
						{/* FORM */}
						<Input
							label="Hive Name"
							value={hiveName}
							onChange={(e) => setHiveName(e.target.value)}
						/>
						{/* HIVE LOCATION */}
						{/* onBlur on the wrapper (Input has no onBlur prop) —
						    tidies the text to "Barangay, City" when leaving */}
						<div className="w-full" onBlur={loc.tidyText}>
							<Input
								label="Location"
								value={loc.location}
								onChange={(e) => loc.setLocation(e.target.value)}
								placeholder="e.g. Moonwalk, Parañaque"
							/>
						</div>
						<span
							className={`text-xs -mt-2 ${
								loc.geoError || loc.lookup === "notFound"
									? "text-red-600"
									: "text-[#817b70]"
							}`}>
							{loc.geoError ?? loc.hint}
						</span>
						{/* BEE SPECIES — pick from the list OR type another species */}
						<SpeciesCombobox
							value={beeSpecies}
							onChange={setBeeSpecies}
						/>
						<div className="flex gap-2 lg:flex-row flex-col">
							<Input
								label="Date Established"
								type="date"
								value={dateEstablished}
								onChange={(e) =>
									setDateEstablished(e.target.value)
								}
							/>
							<Input
								label="Queen Established Date"
								type="date"
								value={queenDate}
								onChange={(e) => setQueenDate(e.target.value)}
							/>
						</div>
						<p className="text-[10px] text-[#817b70] -mt-2">
							Queen Established Date: when the current queen was
							put in. Leave blank if she came with the hive (same
							as Date Established). A queen past the age limit
							gets a &quot;Replace Queen&quot; recommendation.
						</p>

						<div className="flex gap-2 lg:flex-row flex-col">
							<Input
								label="Historical Yield (kg, if any)"
								value={histYieldKg}
								onChange={(e) => setHistYieldKg(e.target.value)}
							/>
							<Input
								label="Historical Yield Year"
								value={histYieldYear}
								onChange={(e) =>
									setHistYieldYear(e.target.value)
								}
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
											checked={
												healthStatus === stat.value
											}
											onChange={() =>
												setHealthStatus(stat.value)
											}
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
					</div>
				</div>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				<div className="flex justify-center">
					<Button
						buttonType="submit"
						width="lg:w-1/2 w-full"
						label={submitting ? "Adding..." : "Add"}
						disabled={submitting}
					/>
				</div>
			</form>
		</ModalContainer>
	);
};

// ─────────────────────────────────────────────
// EDIT HIVE (NEW) — the pencil on the Hive Details card. Same fields and
// look as Add New Hive (map + Location included), minus health status
// (that comes from Monitor Hive Health / Add Yield) and historical yield.
// ─────────────────────────────────────────────
type EditHiveProps = ModalProps & {
	hive?: Hive | null;
};

const HIVE_STATE_OPTIONS: { label: string; value: HiveState }[] = [
	{ label: "Active", value: "Active" },
	{ label: "Inactive", value: "Inactive" },
];

export const EditHiveModal = ({
	isOpen,
	onClose,
	onConfirm,
	hive,
}: EditHiveProps) => {
	const [hiveName, setHiveName] = useState("");
	const [beeSpecies, setBeeSpecies] = useState("");
	const [dateEstablished, setDateEstablished] = useState("");
	const [queenDate, setQueenDate] = useState("");
	const [hiveState, setHiveState] = useState<HiveState>("Active");
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	// NEW — map pin + Location text (same as Add New Hive). This hive
	// is the main pin, so it's left out of the other-hive pins.
	const loc = useHiveLocation(isOpen, hive?.hive_id);

	// Fill the form with the hive's current details each time it opens.
	useEffect(() => {
		if (!isOpen || !hive) return;
		setHiveName(hive.hive_name ?? "");
		setBeeSpecies(hive.bee_species ?? "");
		setDateEstablished(toInputDate(hive.date_established));
		setQueenDate(toInputDate(hive.queen_installed_date));
		setHiveState(hive.hive_state ?? "Active");
		loc.reset(hive);
		setErrorMsg(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, hive]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMsg(null);

		if (!hive) {
			setErrorMsg("No hive selected.");
			return;
		}
		if (!hiveName.trim() || !beeSpecies.trim() || !dateEstablished) {
			setErrorMsg(
				"Hive name, bee species, and date established are required.",
			);
			return;
		}
		if (loc.lookup === "searching") {
			setErrorMsg("Still finding that place on the map — wait a moment.");
			return;
		}
		if (isFutureDate(dateEstablished)) {
			setErrorMsg("Date established can't be in the future.");
			return;
		}
		if (queenDate) {
			if (isFutureDate(queenDate)) {
				setErrorMsg("Queen established date can't be in the future.");
				return;
			}
			if (queenDate < dateEstablished) {
				setErrorMsg(
					"Queen established date can't be before the hive was established.",
				);
				return;
			}
		}

		setSubmitting(true);
		try {
			const res = await hiveService.update(hive.hive_id, {
				hive_name: hiveName.trim(),
				bee_species: beeSpecies.trim(),
				date_established: dateEstablished,
				// blank -> server uses date_established
				queen_installed_date: queenDate || null,
				hive_state: hiveState,
				// NEW — location + pin (no pin -> stays empty)
				location: await loc.locationToSave(), // "Barangay, City"
				latitude: loc.coords?.lat ?? null,
				longitude: loc.coords?.lng ?? null,
			});

			// OFFLINE MODE — saved on the phone, sent later.
			if (res.queued) {
				setSubmitting(false);
				onClose();
				return;
			}

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
			// Name / state / queen age may have changed everywhere.
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
			width=""
			height="lg:max-h-full max-h-[80vh]"
			header="Edit Hive"
			onClose={onClose}>
			<form
				onSubmit={handleSubmit}
				className="w-full flex flex-col gap-3">
				<div className="w-full flex lg:flex-row flex-col gap-3">
					{/* MAPS — same as Add New Hive */}
					<div className="w-full aspect-square rounded-lg overflow-hidden relative">
						<HiveLocationMap loc={loc} disabled={submitting} />
					</div>

					<div className="w-full flex flex-col gap-3">
						<Input
							label="Hive Name"
							value={hiveName}
							onChange={(e) => setHiveName(e.target.value)}
						/>
						{/* HIVE LOCATION */}
						{/* onBlur on the wrapper (Input has no onBlur prop) —
						    tidies the text to "Barangay, City" when leaving */}
						<div className="w-full" onBlur={loc.tidyText}>
							<Input
								label="Location"
								value={loc.location}
								onChange={(e) => loc.setLocation(e.target.value)}
								placeholder="e.g. Moonwalk, Parañaque"
							/>
						</div>
						<span
							className={`text-xs -mt-2 ${
								loc.geoError || loc.lookup === "notFound"
									? "text-red-600"
									: "text-[#817b70]"
							}`}>
							{loc.geoError ?? loc.hint}
						</span>
						<SpeciesCombobox
							value={beeSpecies}
							onChange={setBeeSpecies}
						/>
						<div className="flex gap-2 lg:flex-row flex-col items-end">
							<Input
								label="Date Established"
								type="date"
								value={dateEstablished}
								onChange={(e) =>
									setDateEstablished(e.target.value)
								}
							/>
							<Input
								label="Queen Established Date"
								type="date"
								value={queenDate}
								onChange={(e) => setQueenDate(e.target.value)}
							/>
						</div>
						<p className="text-[10px] text-[#817b70] -mt-2">
							Queen Established Date: when the current queen was
							put in. Leave blank if she came with the hive (same
							as Date Established).
						</p>

						<Select
							label="Hive State"
							options={HIVE_STATE_OPTIONS}
							value={hiveState}
							onSelectChange={(e) =>
								setHiveState(e.target.value as HiveState)
							}
						/>
					</div>
				</div>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				<div className="flex items-center gap-3 w-full mt-2">
					<CancelButton onClick={onClose} disabled={submitting} />
					<Button
						buttonType="submit"
						label={submitting ? "Saving..." : "Save Changes"}
						disabled={submitting}
					/>
				</div>
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
			// Default to today (this device's date) — change it if the
			// check was done on another day.
			setActivityDate(localToday());
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
			setErrorMsg(
				"Please select at least one physical inspection observation.",
			);
			return;
		}
		if (!activityDate) {
			setErrorMsg("Please pick the activity date.");
			return;
		}
		if (isFutureDate(activityDate)) {
			setErrorMsg("The activity date can't be in the future.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await hiveService.recordInspection(hive.hiveId, {
				observations,
				activity_date: activityDate || null,
			});

			// OFFLINE MODE — saved on the phone, sent later.
			if (res.queued) {
				setSubmitting(false);
				onClose();
				return;
			}

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
			width="lg:w-1/3 w-full"
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
									boxShadow:
										"rgba(0, 0, 0, 0.24) 0px 3px 8px",
								}}>
								<div className="flex justify-start items-center gap-2">
									<input
										type="checkbox"
										name="observations"
										className="hidden"
										checked={checked}
										onChange={() =>
											toggleObservation(label)
										}
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
	// NEW: the harvest's own physical-sign check — required now,
	// same options/toggle behavior as the standalone Monitor Hive
	// Health modal above, kept as this component's own local state
	// (MonitorHealth's inspection session stays fully independent).
	const [observations, setObservations] = useState<InspectionObservation[]>(
		[],
	);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			// Default to today (this device's date).
			setHarvestDate(localToday());
			setYieldKg("");
			setObservations([]);
			setErrorMsg(null);
		}
	}, [isOpen, hive?.hiveId]);

	// Same mutual-exclusion behavior as MonitorHealth's toggle:
	// "Normal / Healthy" clears any symptom checkboxes and vice versa.
	const toggleObservation = (label: InspectionObservation) => {
		setObservations((prev) => {
			const isChecked = prev.includes(label);

			if (label === NORMAL_LABEL) {
				return isChecked ? [] : [NORMAL_LABEL];
			}

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
		const kg = parseFloat(yieldKg);
		if (Number.isNaN(kg) || kg < 0) {
			setErrorMsg("Please enter a valid yield amount.");
			return;
		}
		if (observations.length === 0) {
			setErrorMsg(
				"Please select at least one physical inspection observation.",
			);
			return;
		}
		if (isFutureDate(harvestDate)) {
			setErrorMsg("The harvest date can't be in the future.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await yieldService.addHarvest(hive.hiveId, {
				yield_kg: kg,
				yield_date: harvestDate || null,
				observations,
			});

			// OFFLINE MODE — saved on the phone, sent later.
			if (res.queued) {
				setSubmitting(false);
				onClose();
				return;
			}

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

			// NEW: new harvest affects Dashboard tiles, yield trend,
			// health_status, and possibly a queen recommendation —
			// refresh everywhere.
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
			width="lg:w-1/3 w-full"
			height="lg:max-h-full max-h-[80vh]"
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
				<p className="text-[10px] text-[#817b70] -mt-2">
					Already logged a harvest for this hive on the same date?
					This amount is added to it (e.g. 150 kg + 15 kg = 165 kg).
				</p>

				<label className="lg:text-base text-xs text-black">
					Physical Inspection
				</label>
				<p className="text-[10px] text-[#817b70] -mt-2">
					Select all that apply for this harvest.
				</p>
				<div className="grid grid-cols-2 gap-2 mb-3">
					{PhysicalInspectionOptions.map((label) => {
						const checked = observations.includes(label);
						return (
							<label
								key={label}
								className="rounded-lg p-2 group transition-all cursor-pointer border-2 border-transparent has-[input:checked]:bg-[#a6a3a3]/20 has-[input:checked]:border-2 has-[input:checked]:border-[#a6a3a3]"
								style={{
									boxShadow:
										"rgba(0, 0, 0, 0.24) 0px 3px 8px",
								}}>
								<div className="flex justify-start items-center gap-2">
									<input
										type="checkbox"
										name="yield-observations"
										className="hidden"
										checked={checked}
										onChange={() =>
											toggleObservation(label)
										}
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
		status: "healthy" | "weak" | "needs attention" | "diseased";
		hiveState: string;
		// NEW — shown as "Established:" (was always blank).
		dateEstablished?: string;
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
	// DELETE (NEW) — the row asking "Delete?", the one being deleted, and
	// a small message. Reloads the list after a delete.
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		setConfirmId(null);
		setDeleteMsg(null);
	}, [activeTab, isOpen]);

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
	}, [isOpen, hiveSummary?.hiveId, reloadKey]);

	const handleDelete = async (id: string) => {
		if (!hiveSummary?.hiveId || deletingId) return;
		setDeletingId(id);
		setDeleteMsg(null);
		const res =
			activeTab === "monitoring"
				? await hiveService.deleteMaintenance(hiveSummary.hiveId, id)
				: await yieldService.deleteHarvest(hiveSummary.hiveId, id);
		setDeletingId(null);
		setConfirmId(null);
		if (!res.success) {
			setDeleteMsg(
				res.message || "Couldn't delete it. Please try again.",
			);
			return;
		}
		setDeleteMsg(
			activeTab === "monitoring"
				? "Monitoring record deleted."
				: "Harvest deleted — it was taken off the totals.",
		);
		setReloadKey((k) => k + 1);
		// Yield totals / health changed -> refresh Hives, Dashboard, History.
		notifyHivesChanged();
	};

	const monitoringEntries: HistoryEntry[] = maintenance.map((m) => ({
		id: m.maintenance_id,
		date: m.activity_date,
		status: m.remarks || m.activity_type,
	}));
	const harvestEntries: HistoryEntry[] = harvests
		.filter((h) => !h.is_baseline)
		.map((h) => ({
			id: h.yield_id,
			date: h.yield_date,
			yield: `${h.yield_kg.toFixed(2)}kg`,
		}));

	const grouped: Record<string, HistoryEntry[]> = groupByMonth(
		activeTab === "monitoring" ? monitoringEntries : harvestEntries,
	);

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/3 w-full"
			height="h-full"
			header="Transaction History"
			onClose={onClose}>
			<div className="flex flex-col gap-3">
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

				{loading ? (
					<HiveTransSkeleton />
				) : (
					hiveSummary && (
						<HiveTrans
							hive={hiveSummary.hive}
							location={hiveSummary.species}
							lastCheck={hiveSummary.dateEstablished ?? ""}
							status={hiveSummary.status}
							hiveState={hiveSummary.hiveState}
						/>
					)
				)}

				{deleteMsg && (
					<p className="text-xs text-center text-[#817b70]">
						{deleteMsg}
					</p>
				)}

				<div className="border-2 border-[#e2e2e6] rounded-xl p-2 flex-1 flex flex-col gap-5 overflow-y-auto overflow-x-hidden min-h-0">
					{loading ? (
						<HistoryTableSkeleton />
					) : Object.keys(grouped).length === 0 ? (
						<p className="text-center text-sm text-[#817b70] p-4">
							No{" "}
							{activeTab === "monitoring"
								? "monitoring"
								: "harvest"}{" "}
							records yet.
						</p>
					) : (
						<table className="w-full border-collapse">
							<tbody>
								{Object.entries(grouped).map(
									([month, entries]) => (
										<React.Fragment key={month}>
											<tr className="border-b border-[#e0e0e0]">
												<td
													colSpan={3}
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
														{activeTab ===
														"monitoring"
															? entry.status
															: entry.yield}
													</td>
													{/* DELETE (NEW) */}
													<td className="pr-2 py-3 text-right w-px whitespace-nowrap">
														{entry.id &&
															(confirmId ===
															entry.id ? (
																<span className="flex items-center justify-end gap-2 text-xs">
																	<button
																		type="button"
																		onClick={() =>
																			handleDelete(
																				entry.id!,
																			)
																		}
																		disabled={
																			deletingId !==
																			null
																		}
																		className="Poppins-SemiBold text-red-600 cursor-pointer disabled:opacity-60">
																		{deletingId ===
																		entry.id
																			? "Deleting…"
																			: "Delete"}
																	</button>
																	<button
																		type="button"
																		onClick={() =>
																			setConfirmId(
																				null,
																			)
																		}
																		disabled={
																			deletingId !==
																			null
																		}
																		className="text-[#817b70] cursor-pointer">
																		Cancel
																	</button>
																</span>
															) : (
																<button
																	type="button"
																	onClick={() =>
																		setConfirmId(
																			entry.id!,
																		)
																	}
																	aria-label="Delete"
																	title="Delete"
																	className="w-7 h-7 p-1 rounded-full hover:bg-red-50 inline-flex items-center justify-center cursor-pointer">
																	<Icon
																		icon="mdi:trash-can-outline"
																		className="w-full h-full text-red-500"
																	/>
																</button>
															))}
													</td>
												</tr>
											))}
										</React.Fragment>
									),
								)}
							</tbody>
						</table>
					)}
				</div>
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
			width="lg:w-1/4 w-full"
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
	// NEW — from the hive's open queen recommendation (Hives list).
	reasonCode?: string | null;
	reason?: string | null;
};

// Reason codes from the backend's queen_service.py
const QUEEN_TOO_OLD = "QUEEN_AGE_EXCEEDED";

type BeeQueenModalProps = ModalProps & {
	hive?: BeeQueenModalHive | null;
	onReplaceQueen?: () => void;
};

const QUEEN_ALERT_TEXT: Partial<
	Record<HealthStatus, { title: string; message: string }>
> = {
	"Needs Attention": {
		title: "QUEEN BEE NEEDS ATTENTION",
		message:
			"Consider replacing the queen bee for a more productive colony.",
	},
	Weak: {
		title: "HIVE IS WEAK",
		message: "This hive is weakening. Consider replacing the queen bee.",
	},
	Diseased: {
		title: "HIVE IS DISEASED",
		message:
			"This hive shows signs of disease. Consider replacing the queen bee.",
	},
};

export const BeeQueenModal = ({
	isOpen,
	onClose,
	hive,
	onReplaceQueen,
}: BeeQueenModalProps) => {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	if (!mounted || !isOpen || !hive) return null;

	// Old queen -> say so, even if the hive itself is Healthy.
	const alertText =
		hive.reasonCode === QUEEN_TOO_OLD
			? {
					title: "QUEEN BEE IS TOO OLD",
					message:
						hive.reason ||
						"This queen has passed the recommended age. Replace her to keep the colony productive.",
				}
			: (QUEEN_ALERT_TEXT[hive.healthStatus] ??
				QUEEN_ALERT_TEXT["Needs Attention"]!);

	return createPortal(
		<div
			className="fixed inset-0 w-full h-full bg-black/50 z-10000 flex justify-center items-center"
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

					<div className="flex items-center lg:flex-row flex-col-reverse gap-3 w-full">
						<CancelButton onClick={onClose} />
						<Button
							buttonType="button"
							label="Replace Queen"
							onClick={onReplaceQueen}
						/>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};