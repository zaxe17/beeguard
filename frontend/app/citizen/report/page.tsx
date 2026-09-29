// app/citizen/report/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";

import { Input } from "@/components/ui/Input";
import ReportSubmitted from "@/components/ReportSubmitted";
import { speciesLabel } from "@/data/species";
import { useModal } from "@/context/ModalContext";
import { useReportFlow } from "@/context/ReportFlowContext";
import { cvScanService } from "@/services/cvscan";
import { RETAKE_PHOTO_EVENT } from "@/components/modal/ReportModal";
import { citizenReportService } from "@/services/citizenReport";
import {
	formatCoords,
	parseCoords,
	reverseGeocode,
	searchPlace,
} from "@/services/geocode";

type ModalType = "beeIdentify" | "swarmNotice";

// Leaflet touches `window` at module-evaluation time, so it can't be
// server-rendered — same fix already applied in AlertModal.tsx,
// alert/details/page.tsx, and citizen/location/page.tsx.
const Map = dynamic(() => import("@/components/ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

// reports.description is VARCHAR(50) — see validators/report_validator.py.
const DESCRIPTION_MAX_LEN = 50;
// Wait this long after the user stops typing before looking up a place.
const GEOCODE_DEBOUNCE_MS = 800;

// This device's current date "YYYY-MM-DD" and time "HH:MM".
const nowDateTime = () => {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return {
		date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
		time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
	};
};

// Step 3's Date & Time. Left empty in step 2 = "reporting it right now",
// so show the current date & time (the same time the report is saved
// with) instead of "Not specified".
const formatSighted = (date: string, time: string) => {
	if (!date || !time) {
		const now = nowDateTime();
		date = now.date;
		time = now.time;
	}
	const d = new Date(`${date}T${time}`);
	return `${d.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	})} • ${d
		.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
		.toLowerCase()}`;
};

// Shared photo + species block for steps 2 and 3.
const PhotoAndSpecies = () => {
	const { photoPreview, scan } = useReportFlow();
	return (
		<div className="h-full min-h-0 flex flex-col gap-2">
			<div className="w-full flex-1 min-h-40 relative rounded-xl overflow-hidden bg-[#f3eed8]">
				{photoPreview && (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={photoPreview}
						alt="Reported bees"
						className="absolute inset-0 w-full h-full object-cover"
					/>
				)}
			</div>

			<div className="flex flex-col gap-1 shrink-0">
				<span className="Poppins-SemiBold text-sm text-[#817b70]">
					Bee Specification:
				</span>
				<span className="py-1 px-3 sm:px-5 flex justify-center items-center border-2 border-[#ffce1c] rounded-lg text-center text-[#4a2f00] text-sm sm:text-lg">
					{speciesLabel(scan?.identified_species)}
				</span>
			</div>
		</div>
	);
};

// 1ST STEP: TAKING OR UPLOADING PHOTO
const Camera = () => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [error, setError] = useState<string | null>(null);
	const [photo, setPhoto] = useState<string | null>(null);
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [scanError, setScanError] = useState<string | null>(null);
	const [locationError, setLocationError] = useState<string | null>(null);

	const {
		registerNext,
		setCanProceed,
		setScanning,
		setLocation,
		setLocationSource,
		setScan,
		setPhotoPreview,
		updateDetails,
	} = useReportFlow();
	const { openModal } = useModal<ModalType>();

	// Only for the "Take Photo" flow — an uploaded image could've been
	// taken anywhere, so location for that case is left for the user
	// to set manually in step 2 instead of guessing from the device.
	const captureLocationFromDevice = () => {
		if (!navigator.geolocation) {
			setLocationError(
				"Location isn't supported on this device — please set it manually.",
			);
			setLocationSource("manual");
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const coords = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				};
				setLocation(coords);
				setLocationSource("auto");
				setLocationError(null);
				// Show a place name in step 2's (read-only) Location field.
				updateDetails({
					locationText: formatCoords(coords.lat, coords.lng),
				});
				reverseGeocode(coords.lat, coords.lng).then((label) => {
					if (label) updateDetails({ locationText: label });
				});
			},
			(err) => {
				console.error("Geolocation error:", err);
				setLocationError(
					"Couldn't get your location — please set it manually.",
				);
				setLocationSource("manual");
			},
			{ enableHighAccuracy: true, timeout: 10000 },
		);
	};

	// ROTATE CAMERA — "environment" = back camera, "user" = front camera.
	const [facing, setFacing] = useState<"environment" | "user">("environment");
	// Only show the rotate button if the device has more than one camera.
	const [canSwitch, setCanSwitch] = useState(false);
	const [switching, setSwitching] = useState(false);

	useEffect(() => {
		let mounted = true;

		const startCamera = async () => {
			// Stop the camera that's running now before opening the other one
			// (most phones can't open both at the same time).
			streamRef.current?.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: facing } },
					audio: false,
				});

				if (!mounted) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}

				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
				setError(null);

				// Camera names/count are only visible after permission.
				const devices = await navigator.mediaDevices.enumerateDevices();
				if (mounted) {
					setCanSwitch(devices.filter((d) => d.kind === "videoinput").length > 1);
				}
			} catch (err) {
				console.error("Camera access error:", err);
				if (mounted) setError("Unable to access camera");
			} finally {
				if (mounted) setSwitching(false);
			}
		};

		startCamera();

		return () => {
			mounted = false;
			streamRef.current?.getTracks().forEach((track) => track.stop());
		};
	}, [facing]);

	const handleRotateCamera = () => {
		if (switching) return;
		setSwitching(true);
		setFacing((f) => (f === "environment" ? "user" : "environment"));
	};

	// "Retake Photo" (BeeIdentify popup, no bee detected): clear the photo
	// and go back to the live camera.
	useEffect(() => {
		const retake = () => {
			setPhoto(null);
			setPhotoPreview(null);
			setUploadedFile(null);
			setScan(null);
			setScanError(null);
			setCanProceed(false);
		};
		window.addEventListener(RETAKE_PHOTO_EVENT, retake);
		return () => window.removeEventListener(RETAKE_PHOTO_EVENT, retake);
	}, [setPhotoPreview, setScan, setCanProceed]);

	// When the <video> comes back after a retake, reconnect the camera.
	useEffect(() => {
		if (!photo && videoRef.current && streamRef.current) {
			videoRef.current.srcObject = streamRef.current;
		}
	}, [photo]);

	const handleTakePhoto = () => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		// No frame yet (camera still starting / switching) -> ignore.
		if (!video || !canvas || !video.videoWidth) return;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL("image/jpeg");
		setPhoto(dataUrl);
		setPhotoPreview(dataUrl);
		setScanError(null);
		captureLocationFromDevice();

		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const file = new File([blob], `capture-${Date.now()}.jpg`, {
					type: "image/jpeg",
				});
				setUploadedFile(file);
				setCanProceed(true);
			},
			"image/jpeg",
			0.92,
		);
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadedFile(file);
		setScanError(null);
		setCanProceed(true);
		setLocation(null);
		setLocationSource("manual");
		setLocationError(null);
		updateDetails({ locationText: "" });

		const reader = new FileReader();
		reader.onload = () => {
			setPhoto(reader.result as string);
			setPhotoPreview(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	// Registered with the layout's Next button — this is the ONLY
	// place the scan call fires. Advancing to step 2 happens when the
	// user confirms the result in the BeeIdentify modal (see
	// app/citizen/layout.tsx), not here.
	useEffect(() => {
		registerNext(async () => {
			if (!uploadedFile) return;

			setScanning(true);
			setScanError(null);

			const res = await cvScanService.scan(uploadedFile);

			setScanning(false);

			if (!res.success || !res.data) {
				setScanError(
					res.message ||
						"Failed to identify species. Please try again.",
				);
				return;
			}

			// NEW — kept for step 3's POST /api/reports (needs cvscan_id).
			setScan({
				cvscan_id: res.data.cvscan_id,
				image_url: res.data.image_url,
				identified_species: res.data.identified_species,
				confidence_score: res.data.confidence_score,
			});

			openModal("beeIdentify", {
				species: res.data.identified_species,
				confidencePercent: res.data.confidence_score,
			});
		});

		return () => registerNext(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uploadedFile]);

	return (
		<div className="lg:w-2/3 w-full h-full flex flex-col justify-center items-center gap-3">
			{/* CAMERA */}
			<div className="aspect-square border-5 border-[#e2e2e6] rounded-2xl overflow-hidden relative">
				{photo ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={photo}
						alt="Captured"
						className="w-full h-full object-cover rounded-2xl"
					/>
				) : (
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						className="w-full h-full object-cover rounded-2xl"
					/>
				)}

				{/* ROTATE CAMERA (front / back) — phones with 2+ cameras */}
				{!photo && canSwitch && (
					<button
						type="button"
						onClick={handleRotateCamera}
						disabled={switching}
						aria-label="Switch camera"
						title="Switch camera"
						className="absolute top-3 right-3 z-10 w-11 h-11 p-2 rounded-full bg-black/40 hover:bg-black/55 backdrop-blur-sm flex items-center justify-center cursor-pointer disabled:opacity-50">
						<Icon
							icon={switching ? "svg-spinners:ring-resize" : "mdi:camera-flip-outline"}
							className="w-full h-full text-white"
						/>
					</button>
				)}

				{error && (
					<div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 bg-white/70 rounded-2xl">
						{error}
					</div>
				)}

				<canvas ref={canvasRef} className="hidden" />
			</div>

			<div className="w-full flex justify-center gap-20">
				<div
					onClick={handleTakePhoto}
					className="w-15 h-15 p-3 rounded-full bg-[#ffce1c] flex items-center justify-center cursor-pointer">
					<Icon
						icon="entypo:camera"
						className="w-full h-full text-white"
					/>
				</div>

				<div
					onClick={handleUploadClick}
					className="w-15 h-15 p-3 rounded-full bg-[#ffce1c] flex items-center justify-center cursor-pointer">
					<Icon
						icon="icon-park-outline:upload-picture"
						className="w-full h-full text-white"
					/>
				</div>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleFileChange}
				/>
			</div>

			{scanError && (
				<p className="text-red-500 text-sm text-center">{scanError}</p>
			)}
			{locationError && (
				<p className="text-[#a6a3a3] text-xs text-center">
					{locationError}
				</p>
			)}
		</div>
	);
};

// 2ND STEP: COMPLETING DETAILS
const FormDetails = () => {
	const {
		registerNext,
		advanceStep,
		setCanProceed,
		location,
		locationSource,
		setLocation,
		details,
		updateDetails,
	} = useReportFlow();

	const isAutoLocation = locationSource === "auto" && !!location;

	// "searching" | "found" | "notFound" — feedback under the Location box.
	const [lookup, setLookup] = useState<
		"idle" | "searching" | "found" | "notFound"
	>(location ? "found" : "idle");
	// Set when the text was filled in by a map click, so it doesn't get
	// looked up again (which could move the pin away from the click).
	const skipNextLookup = useRef(false);

	// ── Typed location -> pin on the map ─────────────
	useEffect(() => {
		if (isAutoLocation) return;
		if (skipNextLookup.current) {
			skipNextLookup.current = false;
			return;
		}

		const text = details.locationText.trim();
		if (text.length < 3) {
			setLookup("idle");
			return;
		}

		// "14.67604, 121.0437" typed directly — no lookup needed.
		const coords = parseCoords(text);
		if (coords) {
			setLocation(coords);
			setLookup("found");
			return;
		}

		let cancelled = false;
		setLookup("searching");
		const t = setTimeout(async () => {
			const place = await searchPlace(text);
			if (cancelled) return;
			if (place) {
				setLocation({ lat: place.lat, lng: place.lng });
				setLookup("found");
			} else {
				setLookup("notFound");
			}
		}, GEOCODE_DEBOUNCE_MS);

		return () => {
			cancelled = true;
			clearTimeout(t);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [details.locationText, isAutoLocation]);

	// ── Map click -> pin + place name in the Location box ─
	const handleMapSelect = async (coords: { lat: number; lng: number }) => {
		setLocation(coords);
		setLookup("found");
		skipNextLookup.current = true;
		updateDetails({ locationText: formatCoords(coords.lat, coords.lng) });
		const label = await reverseGeocode(coords.lat, coords.lng);
		if (label) {
			skipNextLookup.current = true;
			updateDetails({ locationText: label });
		}
	};

	// ── Validation (mirrors validators/report_validator.py) ─
	const hasDate = !!details.sighted_date;
	const hasTime = !!details.sighted_time;
	const sightedInFuture =
		hasDate &&
		hasTime &&
		new Date(`${details.sighted_date}T${details.sighted_time}`) >
			new Date();

	let formError: string | null = null;
	if (hasDate !== hasTime)
		formError =
			"Please fill in both the date and the time, or leave both empty.";
	else if (sightedInFuture)
		formError = "The date and time can't be in the future.";

	const ready =
		!!location &&
		!!details.bee_danger &&
		!formError &&
		lookup !== "searching";

	useEffect(() => {
		setCanProceed(ready);
	}, [ready, setCanProceed]);

	// Next -> step 3 (review). The Swarm Notice already showed right
	// after "Submit Photo" (see app/citizen/layout.tsx).
	useEffect(() => {
		registerNext(async () => {
			advanceStep();
		});
		return () => registerNext(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const locationHint = isAutoLocation
		? "Taken from your device's location."
		: lookup === "searching"
			? "Finding that place on the map…"
			: lookup === "notFound"
				? "Couldn't find that place. Try adding the city, or tap the map to drop a pin."
				: lookup === "found"
					? "Pin placed. Tap the map to adjust it."
					: "Type a place (e.g. Payatas, Quezon City) or tap the map.";

	const dangerOption = (value: "Yes" | "No") => (
		<label className="w-full h-8 flex justify-center items-center rounded-lg p-2 group transition-all cursor-pointer border-2 border-[#e2e2e6] bg-white/70 has-[input:checked]:bg-[#ffdb4f]/70 has-[input:checked]:border-2 has-[input:checked]:border-[#ff9a00]">
			<div className="flex justify-center items-center">
				<input
					type="radio"
					name="bee_danger"
					value={value}
					checked={details.bee_danger === value}
					onChange={() => updateDetails({ bee_danger: value })}
					className="hidden"
				/>
				<span
					className="Poppins-SemiBold text-sm"
					style={{ color: "#4a2f00" }}>
					{value}
				</span>
			</div>
		</label>
	);

	return (
		<div className="w-7/8 h-full flex lg:flex-row flex-col-reverse justify-between gap-4">
			<div className="lg:w-1/2 w-full lg:h-full h-auto flex flex-col gap-3 min-h-0">
				<div className="lg:h-1/2 h-56 min-h-0 rounded-xl overflow-hidden shrink-0 isolate">
					<Map
						markerPosition={location}
						onLocationSelect={handleMapSelect}
						readOnly={isAutoLocation}
					/>
				</div>

				<div className="lg:h-1/2 h-auto min-h-0">
					<PhotoAndSpecies />
				</div>
			</div>

			<div className="lg:w-1/2 w-full h-full">
				<form
					onSubmit={(e) => e.preventDefault()}
					className="h-full flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<Input
							label="Location"
							value={details.locationText}
							onChange={
								isAutoLocation
									? undefined
									: (e) =>
											updateDetails({
												locationText: e.target.value,
											})
							}
							disabled={isAutoLocation}
							placeholder={
								isAutoLocation
									? undefined
									: "e.g. Payatas, Quezon City"
							}
						/>
						<span
							className={`text-xs ${lookup === "notFound" ? "text-red-600" : "text-[#817b70]"}`}>
							{locationHint}
						</span>
					</div>

					<div className="flex flex-col">
						<label className="Poppins-SemiBold">
							Is anyone in danger?
						</label>
						<div className="flex gap-2">
							{dangerOption("Yes")}
							{dangerOption("No")}
						</div>
					</div>

					<div className="flex flex-col">
						<label className="Poppins-SemiBold">
							When did you see it?
						</label>
						<div className="flex gap-2">
							<Input
								label="Date"
								type="date"
								value={details.sighted_date}
								onChange={(e) =>
									updateDetails({
										sighted_date: e.target.value,
									})
								}
							/>
							<Input
								label="Time"
								type="time"
								value={details.sighted_time}
								onChange={(e) =>
									updateDetails({
										sighted_time: e.target.value,
									})
								}
							/>
						</div>
						{!hasDate && !hasTime && (
							<span className="text-xs text-[#817b70] mt-1">
								Optional. Leave empty if you&apos;re reporting
								it right now.
							</span>
						)}
					</div>

					<div className="h-full min-h-24 flex flex-col">
						<div className="flex justify-between items-end">
							<label className="Poppins-SemiBold">
								Tell us more
							</label>
							<span className="text-xs text-[#817b70]">
								{details.description.length}/
								{DESCRIPTION_MAX_LEN}
							</span>
						</div>
						<textarea
							value={details.description}
							maxLength={DESCRIPTION_MAX_LEN}
							onChange={(e) =>
								updateDetails({ description: e.target.value })
							}
							placeholder="e.g. On a mango tree near the basketball court"
							className="text-sm w-full h-full p-2.5 border border-[#a6a3a3] outline-0 rounded-lg bg-white/70 resize-none"
						/>
					</div>

					<Input
						label="Payment Method"
						value="Cash Upon Rescue"
						disabled
					/>

					{formError && (
						<>
							{/* <p className="text-xs text-red-600">{formError}</p> */}
							{console.log(formError)}
						</>
					)}
					{!location && (
						<p className="text-xs text-[#817b70]">
							Set a location to continue.
						</p>
					)}
					{location && !details.bee_danger && (
						<p className="text-xs text-[#817b70]">
							Choose whether anyone is in danger to continue.
						</p>
					)}
				</form>
			</div>
		</div>
	);
};

// 3RD STEP: REVIEW + SUBMIT REPORT
const ReviewRep = () => {
	const {
		registerNext,
		setCanProceed,
		scan,
		location,
		details,
		setSubmitting,
		setSubmission,
	} = useReportFlow();
	const [submitError, setSubmitError] = useState<string | null>(null);

	useEffect(() => {
		setCanProceed(!!scan && !!location && !!details.bee_danger);

		registerNext(async () => {
			if (!scan || !location || !details.bee_danger) return;

			setSubmitting(true);
			setSubmitError(null);
			const res = await citizenReportService.create({
				cvscan_id: scan.cvscan_id,
				latitude: location.lat,
				longitude: location.lng,
				bee_danger: details.bee_danger,
				// Both or neither — validators/report_validator.py.
				// Left empty = "right now": send the current date & time,
				// so the report shows the same time everywhere (step 3,
				// the report cards and the beekeeper's popup).
				sighted_date: details.sighted_date || nowDateTime().date,
				sighted_time: details.sighted_time || nowDateTime().time,
				description: details.description.trim() || null,
			});
			setSubmitting(false);

			if (res.success) {
				// Show "Report Submitted!" right here — no page change, so
				// "Report Another Swarm" can reset straight back to step 1.
				setSubmission({ reportId: res.data?.reportID ?? null });
			} else {
				// The backend sends field errors as { field: message }.
				const rawErrors = res.errors as unknown;
				const fieldErrors: string[] = Array.isArray(rawErrors)
					? rawErrors.map(String)
					: rawErrors && typeof rawErrors === "object"
						? Object.values(rawErrors as Record<string, string>)
						: [];
				setSubmitError(
					[res.message, ...fieldErrors].filter(Boolean).join(" ") ||
						"Couldn't submit your report. Please try again.",
				);
			}
		});
		return () => registerNext(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [scan, location, details]);

	const locationLabel =
		details.locationText ||
		(location ? formatCoords(location.lat, location.lng) : "Not set");

	return (
		<div className="w-7/8 h-full flex flex-col lg:flex-row justify-between gap-4">
			<div className="lg:w-1/2 w-full lg:h-full h-64 flex flex-col gap-3 min-h-0 shrink-0">
				<PhotoAndSpecies />
			</div>

			<div className="lg:w-1/2 w-full h-full">
				<form
					onSubmit={(e) => e.preventDefault()}
					className="h-full flex flex-col gap-3">
					<Input label="Location" value={locationLabel} disabled />

					<div className="flex gap-2">
						<Input
							label="Date & Time"
							value={formatSighted(
								details.sighted_date,
								details.sighted_time,
							)}
							disabled
						/>
					</div>

					<div className="h-full min-h-24 flex flex-col">
						<label className="lg:text-base text-xs text-[#4a2f00]">
							Details
						</label>
						<textarea
							value={
								details.description || "No details provided."
							}
							readOnly
							disabled
							className="text-sm w-full h-full p-2.5 border border-[#a6a3a3] outline-0 rounded-lg bg-white/70 resize-none cursor-not-allowed"
						/>
					</div>

					<div className="flex lg:flex-row flex-col gap-3">
						<Input
							label="Is anyone in danger?"
							value={details.bee_danger ?? "—"}
							disabled
						/>
						<Input
							label="Payment Method"
							value="Cash Upon Rescue"
							disabled
						/>
					</div>

					{submitError && (
						<>
							{/* <p className="text-sm text-red-600">
								{submitError}
							</p> */}
							{console.log(submitError)}
						</>
					)}
				</form>
			</div>
		</div>
	);
};

const CitizenReport = () => {
	const { step, resetFlow, submission } = useReportFlow();

	// Leaving the Report page (to any other page) starts the next
	// report from a clean step 1.
	useEffect(() => {
		return () => resetFlow();
	}, [resetFlow]);

	if (submission) {
		return (
			<ReportSubmitted
				reportId={submission.reportId}
				onReportAnother={resetFlow}
			/>
		);
	}

	return (
		<div className="w-full h-full flex flex-col justify-center items-center">
			{step === 1 && <Camera />}
			{step === 2 && <FormDetails />}
			{step === 3 && <ReviewRep />}
		</div>
	);
};

export default CitizenReport;