// components/Users.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { ProfilePhoto } from "./ProfilePhoto";
import { Button } from "./ui/Button";
import { VerifyStatus } from "./ui/VerifyStatus";
import { formatPhMobile } from "@/lib/phone";
import { useAuth } from "@/context/AuthContext";
import {
	checkPhotoFile,
	PHOTO_ACCEPT,
	profileService,
} from "@/services/profile";

type UserProp = {
	name?: string;
	role?: string;
	email?: string;
	phoneNo?: string;
	status: "active" | "inactive";
	// NEW — this user's profile photo path (null = default picture)
	photo?: string | null;
};

type ProfileDisplayProps = {
	name?: string;
	email?: string;
	onClick?: () => void;
	// NEW — shows the "Change photo" button on the picture (own profile).
	editablePhoto?: boolean;
	// Beekeeper's verification status (own profile page). Verified -> a
	// "✓ Verified Beekeeper" badge under the email instead of the
	// "Verify Account" button.
	verificationStatus?: string | null;
};

export const Users = ({
	name,
	role,
	email,
	phoneNo,
	status,
	photo,
}: UserProp) => {
	const location = usePathname();
	const pathname = location === "/admin/profile/user";

	return (
		<div
			className={`w-full flex items-start gap-3 p-2 transition-all duration-130 ease-in rounded-xl ${pathname ? "" : "hover:bg-[#fff1ad]/40 hover:scale-101 hover:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]"} `}>
			{/* PROFILE */}
			<div className="lg:w-20 w-11 lg:h-20 h-11 rounded-full overflow-hidden shrink-0">
				<ProfilePhoto src={photo} />
			</div>

			{/* NAME AND OFFER */}
			<div className="min-w-0 flex-1">
				<h3 className="Poppins-SemiBold lg:text-lg text-sm capitalize">
					{name}
				</h3>
				<p className="Poppins-SemiBold text-xs text-[#817b70] capitalize">
					{role}
				</p>
				<p className="text-xs text-[#a6a3a3] truncate">{email}</p>
				<p className="text-xs text-[#a6a3a3]">
					{formatPhMobile(phoneNo)}
				</p>
			</div>

			<div className="shrink-0 pr-1">
				<span
					className={`rounded-full flex items-center justify-center capitalize py-1 lg:text-base text-[10px] lg:w-24 w-16 ${status === "active" ? "bg-[#00cc00] text-white" : "bg-[#e2e2e6] text-[#817b70]"}`}>
					{status}
				</span>
			</div>
		</div>
	);
};

// The camera button on your own profile picture: pick a new photo
// (JPG / PNG / WEBP, max 5 MB) or remove it (back to the default).
const ChangePhotoButton = () => {
	const { user, refresh } = useAuth();
	const inputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(
		null,
	);

	// Close the little menu when clicking elsewhere.
	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node))
				setOpen(false);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	useEffect(() => {
		if (!msg) return;
		const t = setTimeout(() => setMsg(null), 4000);
		return () => clearTimeout(t);
	}, [msg]);

	const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = ""; // allow picking the same file again later
		if (!file) return;
		const problem = checkPhotoFile(file);
		if (problem) {
			setMsg({ text: problem, isError: true });
			return;
		}
		setBusy(true);
		const res = await profileService.uploadPhoto("profile", file);
		setBusy(false);
		if (res.success) {
			await refresh(); // top bar, sidebar, etc. show the new photo
			setMsg({ text: "Profile photo updated." });
		} else {
			setMsg({
				text: res.message || "Couldn't upload the photo.",
				isError: true,
			});
		}
	};

	const onRemove = async () => {
		setOpen(false);
		setBusy(true);
		const res = await profileService.removePhoto("profile");
		setBusy(false);
		if (res.success) {
			await refresh();
			setMsg({ text: "Profile photo removed." });
		} else {
			setMsg({
				text: res.message || "Couldn't remove the photo.",
				isError: true,
			});
		}
	};

	return (
		<>
			<div ref={menuRef} className="absolute -bottom-1 -right-1">
				<button
					type="button"
					title="Change profile photo"
					disabled={busy}
					onClick={() =>
						user?.profile_photo
							? setOpen((o) => !o)
							: inputRef.current?.click()
					}
					className="w-8 h-8 rounded-full bg-[#ffdb4f] border-2 border-white shadow flex items-center justify-center text-[#4a2f00] hover:bg-[#ffce1c] disabled:opacity-60">
					<Icon
						icon={busy ? "eos-icons:loading" : "mdi:camera"}
						className="w-4 h-4"
					/>
				</button>
				{open && (
					<div className="absolute z-50 top-9 left-0 w-40 bg-[#fffdf5] rounded-lg shadow-lg py-1 text-sm">
						<button
							type="button"
							onClick={() => {
								setOpen(false);
								inputRef.current?.click();
							}}
							className="w-full text-left px-3 py-1.5 hover:bg-[#fff4c7] flex items-center gap-2">
							<Icon icon="mdi:image-edit" className="w-4 h-4" />{" "}
							Change photo
						</button>
						<button
							type="button"
							onClick={onRemove}
							className="w-full text-left px-3 py-1.5 hover:bg-[#fff4c7] text-red-600 flex items-center gap-2">
							<Icon
								icon="mdi:delete-outline"
								className="w-4 h-4"
							/>{" "}
							Remove photo
						</button>
					</div>
				)}
			</div>
			<input
				ref={inputRef}
				type="file"
				accept={PHOTO_ACCEPT}
				hidden
				onChange={onPick}
			/>
			{msg && (
				<p
					className={`absolute top-full left-0 mt-1 w-56 text-[11px] z-40 ${
						msg.isError ? "text-red-600" : "text-[#1f6f5f]"
					}`}>
					{msg.text}
				</p>
			)}
		</>
	);
};

export const ProfileDisplay = ({
	name,
	email,
	onClick,
	editablePhoto = false,
	verificationStatus,
}: ProfileDisplayProps) => {
	const location = usePathname();
	const pathName = location === "/beekeeper/profile";

	return (
		<div className="w-full flex items-center gap-3 p-2 transition-all duration-130 ease-in rounded-xl">
			{/* PROFILE — your own photo, with the change button */}
			<div className="relative w-20 h-20 shrink-0">
				<div className="w-full h-full rounded-full overflow-hidden">
					<ProfilePhoto me />
				</div>
				{editablePhoto && <ChangePhotoButton />}
			</div>

			{/* NAME AND EMAIL */}
			<div className="">
				<h3 className="Poppins-SemiBold text-xl capitalize">{name}</h3>
				<p className="text-xs text-[#817b70]">{email}</p>

				{/* BEEKEEPER VERIFICATION (own profile page only) */}
				{pathName && (
					<div className="mt-2 flex flex-col items-start gap-2">
						{/* Status badge — tap to see the verification details */}
						<button
							type="button"
							onClick={onClick}
							className="cursor-pointer">
							<VerifyStatus
								status={verificationStatus ?? "Unverified"}
							/>
						</button>

						{/* Not verified yet -> the Verify Account button.
						    Verified -> no button, the badge above is enough. */}
						{verificationStatus !== "Verified" && (
							<Button
								onClick={onClick}
								width="70%"
								textSize="text-xs"
								label={
									verificationStatus === "Rejected"
										? "Resubmit Document"
										: verificationStatus === "Pending"
											? "View Verification"
											: "Verify Account"
								}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
