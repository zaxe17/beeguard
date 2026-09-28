// app/guest/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

import { useModal } from "@/context/ModalContext";
import { cvScanService, CVScanResult } from "@/services/cvscan";
import { speciesLabel } from "@/data/species";

/**
 * GUEST BEE IDENTIFICATION (no login).
 * Take or upload a photo -> it's identified (POST /api/cv-scans, sent
 * without a login token) -> the result shows under the photo and the
 * "Create an Account to Submit" popup opens (SignupModal, in layout.tsx).
 *
 * Styling is kept minimal on purpose — the frontend team will design it.
 */
type ModalType = "signup";

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

	useEffect(() => {
		let mounted = true;

		const startCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment" },
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
			} catch (err) {
				console.error("Camera access error:", err);
				setError("Unable to access camera. You can upload a photo instead.");
			}
		};

		startCamera();

		return () => {
			mounted = false;
			streamRef.current?.getTracks().forEach((track) => track.stop());
		};
	}, []);

	// After "Retake" the <video> is shown again — hook the live camera back up.
	useEffect(() => {
		if (!photo && videoRef.current && streamRef.current) {
			videoRef.current.srcObject = streamRef.current;
		}
	}, [photo]);

	const handleTakePhoto = async () => {
		if (busy || photo) return;
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas || !streamRef.current || !video.videoWidth) return;

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

				{/* hidden canvas used only for capturing frames */}
				<canvas ref={canvasRef} className="hidden" />
			</div>

			{/* ACTION BUTTONS */}
			{photo ? (
				<button
					type="button"
					onClick={onRetake}
					disabled={busy}
					className="text-sm underline disabled:opacity-50">
					Retake / choose another photo
				</button>
			) : (
				<div className="w-full flex justify-center gap-20">
					{/* TAKE PHOTO BUTTON */}
					<div
						onClick={handleTakePhoto}
						className="w-15 h-15 p-3 rounded-full bg-[#ffce1c] flex items-center justify-center cursor-pointer">
						<Icon icon="entypo:camera" className="w-full h-full text-white" />
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
			)}

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

const GuestIdentify = () => {
	const { openModal } = useModal<ModalType>();

	const [photo, setPhoto] = useState<string | null>(null);
	const [scanning, setScanning] = useState(false);
	const [result, setResult] = useState<CVScanResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handlePhoto = useCallback(
		async (dataUrl: string, file: File) => {
			setPhoto(dataUrl);
			setResult(null);
			setError(null);
			setScanning(true);

			const res = await cvScanService.scanAsGuest(file);
			setScanning(false);

			if (!res.success || !res.data) {
				setError(res.message || "Identification failed. Please try again.");
			} else {
				setResult(res.data);
			}

			// Photo taken/uploaded -> ask the guest to sign up.
			openModal("signup");
		},
		[openModal],
	);

	const handleRetake = () => {
		setPhoto(null);
		setResult(null);
		setError(null);
	};

	return (
		<div className="w-full h-full flex flex-col justify-center items-center gap-3">
			{/* CAMERA */}
			<Camera
				photo={photo}
				busy={scanning}
				onPhoto={handlePhoto}
				onRetake={handleRetake}
			/>

			{/* RESULT (plain — for the design team to style) */}
			{result && (
				<div className="text-center">
					<p className="text-sm">You are seeing:</p>
					<p className="Poppins-Bold text-lg text-[#4a2f00]">
						{result.identified_species
							? speciesLabel(result.identified_species)
							: "No bee detected"}
					</p>
					{result.confidence_score !== null && (
						<p className="text-sm">
							{Math.round(result.confidence_score)}% match
						</p>
					)}
				</div>
			)}

			{error && <p className="text-sm text-red-600 text-center">{error}</p>}
		</div>
	);
};

export default GuestIdentify;