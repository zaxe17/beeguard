"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import Image from "next/image";

import bee from "@/public/assets/bee_example.jpg";
import { Input } from "@/components/ui/Input";

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

// 1ST STEP: TAKING OR UPLOADING PHOTO
const Camera = () => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [error, setError] = useState<string | null>(null);
	const [photo, setPhoto] = useState<string | null>(null);

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
				setError("Unable to access camera");
			}
		};

		startCamera();

		return () => {
			mounted = false;
			streamRef.current?.getTracks().forEach((track) => track.stop());
		};
	}, []);

	const handleTakePhoto = () => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL("image/jpeg");
		setPhoto(dataUrl);

		// TODO: hand off dataUrl to parent / upload logic
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			setPhoto(reader.result as string);
		};
		reader.readAsDataURL(file);

		// TODO: hand off file / reader.result to parent / upload logic
	};

	return (
		<div className="lg:w-2/3 w-full h-full flex flex-col justify-center items-center gap-3">
			{/* CAMERA */}
			<div className="w-full h-full border-3 border-[#e2e2e6] rounded-2xl overflow-hidden relative">
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

				{error && (
					<div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 bg-white/70 rounded-2xl">
						{error}
					</div>
				)}

				{/* hidden canvas used only for capturing frames */}
				<canvas ref={canvasRef} className="hidden" />
			</div>

			{/* ACTION BUTTON (TAKE PHOTO & UPLOAD PHOTO) */}
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
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleFileChange}
				/>
			</div>
		</div>
	);
};

// 2ND STEP: COMPLETING DETAILS
const FormDetails = () => {
	return (
		<div className="w-7/8 h-full flex justify-between gap-4">
			{/* LEFT SIDE */}
			<div className="w-1/2 h-full flex flex-col gap-3 min-h-0">
				{/* MAP */}
				<div className="h-1/2 min-h-0 rounded-xl overflow-hidden">
					<Map />
				</div>

				{/* BEE PICTURE AND SPECIES NAME */}
				<div className="h-1/2 min-h-0 flex flex-col gap-2">
					{/* IMAGE */}
					<div className="w-full flex-1 min-h-0 relative rounded-xl overflow-hidden">
						<Image
							src={bee}
							alt="bee"
							fill
							className="object-cover"
							priority
						/>
					</div>

					{/* BEE SPECIES */}
					<div className="flex flex-col gap-1 shrink-0">
						<span className="Poppins-SemiBold text-sm text-[#817b70]">
							Bee Specification:
						</span>
						<span className="py-1 px-5 flex justify-center items-center border-2 border-[#ffce1c] rounded-lg text-center text-[#4a2f00] text-lg">
							Apis Cerana / Asian Honey Bee
						</span>
					</div>
				</div>
			</div>

			{/* RIGHT SIDE */}
			<div className="w-1/2 h-full">
				<form action="" className="h-full flex flex-col gap-3">
					<Input label="Location" disabled />

					{/* IS ANYONE IN DANGER */}
					<div className="flex flex-col">
						<label htmlFor="" className="Poppins-SemiBold">
							Is anyone in danger?
						</label>
						<div className="flex gap-2">
							<label className="w-full h-8 flex justify-center items-center rounded-lg p-2 group transition-all cursor-pointer border-2 border-[#e2e2e6] bg-white/70 has-[input:checked]:bg-[#ffdb4f]/70 has-[input:checked]:border-2 has-[input:checked]:border-[#ff9a00]">
								<div className="flex justify-center items-center">
									<input
										type="radio"
										name="healthStatus"
										value="yes"
										className="hidden"
									/>
									<span
										className="Poppins-SemiBold text-sm"
										style={{ color: "#4a2f00" }}>
										Yes
									</span>
								</div>
							</label>
							<label className="w-full h-8 flex justify-center items-center rounded-lg p-2 group transition-all cursor-pointer border-2 border-[#e2e2e6] bg-white/70 has-[input:checked]:bg-[#ffdb4f]/70 has-[input:checked]:border-2 has-[input:checked]:border-[#ff9a00]">
								<div className="flex justify-center items-center">
									<input
										type="radio"
										name="healthStatus"
										value="no"
										className="hidden"
									/>
									<span
										className="Poppins-SemiBold text-sm"
										style={{ color: "#4a2f00" }}>
										No
									</span>
								</div>
							</label>
						</div>
					</div>

					{/* WHEN DID YOU SEE IT? */}
					<div className="flex flex-col">
						<label htmlFor="" className="Poppins-SemiBold">
							When did you see it??
						</label>
						<div className="flex gap-2">
							<Input label="Date" />
							<Input label="Time" />
						</div>
					</div>

					<div className="h-full flex flex-col">
						<label htmlFor="" className="Poppins-SemiBold">
							Tell us more
						</label>
						<textarea
							name=""
							id=""
							className="text-sm w-full h-full p-2.5 border border-[#a6a3a3] outline-0 rounded-lg bg-white/70 [appearance:textfield]
    						[&::-webkit-outer-spin-button]:appearance-none
   							[&::-webkit-inner-spin-button]:appearance-none resize-none"></textarea>
					</div>

					<Input
						label="Payment Method"
						value="Cash Upon Rescue"
						disabled
					/>
				</form>
			</div>
		</div>
	);
};

// 3RD: REVIEW REPORT
const ReviewRep = () => {
	return (
		<div className="w-7/8 h-full flex justify-between gap-4">
			{/* LEFT SIDE */}
			<div className="w-1/2 h-full flex flex-col gap-3 min-h-0">
				{/* BEE PICTURE AND SPECIES NAME */}
				<div className="h-full min-h-0 flex flex-col gap-2">
					{/* IMAGE */}
					<div className="w-full flex-1 min-h-0 relative rounded-xl overflow-hidden">
						<Image
							src={bee}
							alt="bee"
							fill
							className="object-cover"
							priority
						/>
					</div>

					{/* BEE SPECIES */}
					<div className="flex flex-col gap-1 shrink-0">
						<span className="Poppins-SemiBold text-sm text-[#817b70]">
							Bee Specification:
						</span>
						<span className="py-1 px-5 flex justify-center items-center border-2 border-[#ffce1c] rounded-lg text-center text-[#4a2f00] text-lg">
							Apis Cerana / Asian Honey Bee
						</span>
					</div>
				</div>
			</div>

			{/* RIGHT SIDE */}
			<div className="w-1/2 h-full">
				<form action="" className="h-full flex flex-col gap-3">
					<Input label="Location" disabled />

					{/* WHEN DID YOU SEE IT? */}
					<div className="flex gap-2">
						<Input label="Date & Time" disabled />
					</div>

					<div className="h-full flex flex-col">
						<label
							htmlFor=""
							className="lg:text-base text-xs text-[#4a2f00]">
							Details
						</label>
						<textarea
							name=""
							id=""
							className="text-sm w-full h-full p-2.5 border border-[#a6a3a3] outline-0 rounded-lg bg-white/70 [appearance:textfield]
    						[&::-webkit-outer-spin-button]:appearance-none
   							[&::-webkit-inner-spin-button]:appearance-none resize-none cursor-not-allowed"
							disabled></textarea>
					</div>

					<div className="flex gap-3">
						<Input
							label="Is anyone in danger?"
							value="Yes"
							disabled
						/>
						<Input
							label="Payment Method"
							value="Cash Upon Rescue"
							disabled
						/>
					</div>
				</form>
			</div>
		</div>
	);
};

const CitizenReport = () => {
	return (
		<div className="w-full h-full flex flex-col justify-center items-center">
			{/* CAMERA */}
			<Camera />

			{/* COMPLETING DETAILS */}
			{/* <FormDetails /> */}

			{/* REVIEW REPORT */}
			{/* <ReviewRep /> */}
		</div>
	);
};

export default CitizenReport;
