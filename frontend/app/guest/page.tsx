// app/guest/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

import { cvScanService } from "@/services/cvscan";
import { useModal } from "@/context/ModalContext";
import { Button } from "@/components/ui/Button";
import {
	BeeIdentify,
	RETAKE_PHOTO_EVENT,
} from "@/components/modal/ReportModal";
import { SignupModal } from "@/components/modal/SignupModal";
import { useRouter } from "next/navigation";

/**
 * GUEST BEE IDENTIFICATION (no login). Scans are sent without a login
 * token (POST /api/cv-scans) and saved as guest scans.
 * Styling is kept minimal on purpose — the frontend team will design it.
 */
// A data URL (canvas capture) -> a real File the upload can send.
const dataUrlToFile = async (dataUrl: string, name: string): Promise<File> => {
	const blob = await (await fetch(dataUrl)).blob();
	return new File([blob], name, { type: blob.type || "image/jpeg" });
};

// 1ST STEP: TAKING OR UPLOADING PHOTO
type CameraProps = {
	photo: string | null;
	busy: boolean;
	onPhoto: (dataUrl: string, file: File) => void;
	onRetake: () => void;
};

const Camera = ({ photo, busy, onPhoto, onRetake }: CameraProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [error, setError] = useState<string | null>(null);

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
					setCanSwitch(
						devices.filter((d) => d.kind === "videoinput").length >
							1,
					);
				}
			} catch (err) {
				console.error("Camera access error:", err);
				if (mounted)
					setError(
						"Unable to access camera. You can upload a photo instead.",
					);
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

	// After "Retake" the <video> is shown again — hook the live camera back up.
	useEffect(() => {
		if (!photo && videoRef.current && streamRef.current) {
			videoRef.current.srcObject = streamRef.current;
		}
	}, [photo]);

	const handleTakePhoto = async () => {
		if (busy) return;
		// A photo is showing -> first tap goes back to the live camera.
		if (photo) {
			onRetake();
			return;
		}
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || !streamRef.current || !video.videoWidth)
			return;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
		const file = await dataUrlToFile(dataUrl, "capture.jpg");
		onPhoto(dataUrl, file);
	};

	const handleUploadClick = () => {
		if (busy) return;
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = ""; // allow picking the same file again
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => onPhoto(reader.result as string, file);
		reader.readAsDataURL(file);
	};

	return (
		<div className="lg:w-2/3 w-full h-full flex flex-col justify-center items-center gap-3">
			{/* CAMERA */}
			<div className="w-full aspect-square border-3 border-[#e2e2e6] rounded-2xl overflow-hidden relative">
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

				{/* RETAKE — on the photo, before pressing Next (no popup) */}
				{photo && !busy && (
					<button
						type="button"
						onClick={onRetake}
						aria-label="Retake photo"
						className="absolute top-3 right-3 z-10 flex items-center gap-1.5 py-2 px-3 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-sm text-white text-xs Poppins-SemiBold cursor-pointer">
						<Icon
							icon="mdi:camera-retake-outline"
							className="w-4 h-4"
						/>
						Retake
					</button>
				)}

				{error && !photo && (
					<div className="absolute inset-0 flex items-center justify-center text-center p-4 text-sm text-red-500 bg-white/70 rounded-2xl">
						{error}
					</div>
				)}

				{busy && (
					<div className="absolute inset-0 flex items-center justify-center text-sm bg-white/70 rounded-2xl">
						Identifying...
					</div>
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
							icon={
								switching
									? "svg-spinners:ring-resize"
									: "mdi:camera-flip-outline"
							}
							className="w-full h-full text-white"
						/>
					</button>
				)}

				{/* hidden canvas used only for capturing frames */}
				<canvas ref={canvasRef} className="hidden" />
			</div>

			{/* ACTION BUTTONS — always shown (Retake is in the result popup).
			    Tapping the camera while a photo is showing goes back to
			    the live camera. */}
			<div className="w-full flex justify-center gap-20">
				{/* TAKE PHOTO BUTTON */}
				<div
					onClick={handleTakePhoto}
					className="w-15 h-15 p-3 rounded-full bg-[#ffce1c] flex items-center justify-center cursor-pointer">
					<Icon
						icon="entypo:camera"
						className="w-full h-full text-white"
					/>
				</div>

				{/* UPLOAD PHOTO BUTTON */}
				<div
					onClick={handleUploadClick}
					className="w-15 h-15 p-3 rounded-full bg-[#ffce1c] flex items-center justify-center cursor-pointer">
					<Icon
						icon="icon-park-outline:upload-picture"
						className="w-full h-full text-white"
					/>
				</div>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				className="hidden"
				onChange={handleFileChange}
			/>
		</div>
	);
};

type ModalType = "beeIdentify" | "signup";
type BeeIdentifyPayload = {
	species: string | null;
	confidencePercent: number | null;
};

/**
 * Flow:
 *   1. take or upload a photo
 *   2. Next -> the bee is identified (saved in cv_scans as a guest scan)
 *   3. result popup ("Bee Species Identified!"):
 *        Submit Photo -> "Log in to submit" popup -> Log In / Sign Up page
 *        Cancel       -> back to the photo
 *        (no bee found -> Retake Photo / Cancel)
 */
const GuestIdentify = () => {
	const { isModalOpen, openModal, closeModal } = useModal<
		ModalType,
		BeeIdentifyPayload
	>();

	const router = useRouter();

	const [photo, setPhoto] = useState<string | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [scanning, setScanning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handlePhoto = useCallback((dataUrl: string, picked: File) => {
		setPhoto(dataUrl);
		setFile(picked);
		setError(null);
	}, []);

	const handleRetake = useCallback(() => {
		setPhoto(null);
		setFile(null);
		setError(null);
	}, []);

	// "Retake Photo" in the result popup (no bee detected).
	useEffect(() => {
		window.addEventListener(RETAKE_PHOTO_EVENT, handleRetake);
		return () =>
			window.removeEventListener(RETAKE_PHOTO_EVENT, handleRetake);
	}, [handleRetake]);

	// Next -> identify the bee, then show the result popup.
	const handleNext = async () => {
		if (!file || scanning) return;
		setScanning(true);
		setError(null);
		const res = await cvScanService.scanAsGuest(file);
		setScanning(false);

		if (!res.success || !res.data) {
			setError(res.message || "Identification failed. Please try again.");
			return;
		}
		openModal("beeIdentify", {
			species: res.data.identified_species,
			confidencePercent: res.data.confidence_score,
		});
	};

	return (
		<div className="w-full h-full flex flex-col items-center gap-3 min-h-0">
			<div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center overflow-y-auto">
				{/* CAMERA */}
				<Camera
					photo={photo}
					busy={scanning}
					onPhoto={handlePhoto}
					onRetake={handleRetake}
				/>
				{error && (
					<p className="text-sm text-red-600 text-center mt-2">
						{error}
					</p>
				)}
			</div>

			{/* NEXT — only after a photo is taken/uploaded */}
			<div className="w-full shrink-0 flex justify-center gap-3">
				<Button
					width="50%"
					bgNone
					label="Back"
					onClick={() => router.back()}
				/>
				<Button
					width="50%"
					label={scanning ? "Identifying..." : "Next"}
					onClick={handleNext}
					disabled={!file || scanning}
				/>
			</div>

			{/* RESULT POPUP — Submit Photo -> must log in first */}
			<BeeIdentify
				isOpen={isModalOpen("beeIdentify")}
				onClose={closeModal}
				onSubmit={() => {
					closeModal();
					openModal("signup");
				}}
			/>

			{/* "Log in to submit" popup */}
			<SignupModal isOpen={isModalOpen("signup")} onClose={closeModal} />
		</div>
	);
};

export default GuestIdentify;
