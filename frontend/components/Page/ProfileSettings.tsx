// components/Page/ProfileSettings.tsx
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Container, FormContainer } from "../ui/Container";
import { ProfileDisplay } from "../Users";
import { PrivacyPolicyPage, TermsConditionPage } from "./TermsCondition";
import { Input, PhoneInput, Select } from "../ui/Input";
import { formatPhMobile } from "@/lib/phone";
import {
	isSoundOn,
	playNotificationSound,
	setSoundOn,
	unlockNotificationSound,
} from "@/lib/notifySound";
import { BackButton, Button } from "../ui/Button";
import { SettingsTabs, SwitchTab } from "../Tab";
import { Icon } from "@iconify/react";
import MobileOverlay from "../MobileOverlay";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { VerifyStatus } from "../ui/VerifyStatus";
import {
	AUTH_REFRESH_EVENT,
	verificationService,
	type VerificationInfo,
} from "@/services/verification";
import dynamic from "next/dynamic";
import {
	APIARY_TYPES,
	checkPhotoFile,
	mediaSrc,
	PHOTO_ACCEPT,
	profileService,
	type MyProfile,
	type ProfileUpdate,
} from "@/services/profile";
import { usePlaceName } from "@/hooks/usePlaceName";
import { getCoordinatesOrFallback } from "@/services/auth";
import { settingsService } from "@/services/settings";
import {
	disablePush,
	enablePush,
	getPushState,
	sendTestPush,
	warmUpPush,
	type PushState,
} from "@/services/push";
import BeefarmView from "../BeefarmView";
import { useIsDesktop } from "@/hooks/useIsDesktop";

type ViewKey = "main" | "settings" | "about" | "verify" | "viewprofile";
type DetailKey =
	| "personal"
	| "password"
	| "privacy"
	| "terms"
	| "verify"
	| null;

type SettingsItem<K> = {
	label: string;
	icon: string;
	onClickName: K;
};

const settingsTab: {
	main: SettingsItem<ViewKey>[];
	settings: SettingsItem<NonNullable<DetailKey>>[];
	about: SettingsItem<NonNullable<DetailKey>>[];
} = {
	main: [
		{
			label: "View Profile",
			icon: "flowbite:profile-card-solid",
			onClickName: "viewprofile",
		},
		{ label: "Settings", icon: "mdi:cog", onClickName: "settings" },
		{
			label: "About BeeGuard",
			icon: "fa7-solid:circle-info",
			onClickName: "about",
		},
	],
	settings: [
		{
			label: "Personal Information",
			icon: "bi:person-circle",
			onClickName: "personal",
		},
		{
			label: "Change Password",
			icon: "carbon:password",
			onClickName: "password",
		},
	],
	about: [
		{
			label: "Privacy Policy",
			icon: "fa7-solid:user-shield",
			onClickName: "privacy",
		},
		{
			label: "Terms & Conditions",
			icon: "fa7-solid:file-contract",
			onClickName: "terms",
		},
	],
};

const DETAIL_TITLES: Record<Exclude<DetailKey, null>, string> = {
	personal: "Personal Information",
	password: "Change Password",
	privacy: "Privacy Policy",
	terms: "Terms & Conditions",
	verify: "Verify Your Account",
};

const useProfileRoute = () => {
	const pathname = usePathname();
	return pathname.startsWith("/beekeeper")
		? "/beekeeper/profile"
		: "/citizen/profile";
};

// Leaflet needs `window` — client-side only.
const Map = dynamic(() => import("../ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

// BEE FARM PHOTO (beekeepers) — the cover picture citizens see on the
// Bee Farm page and in "Nearby Bee Farms". Saved right away on pick.
const FarmPhotoEditor = ({
	photo,
	onChanged,
}: {
	photo: string | null | undefined;
	onChanged: (url: string | null) => void;
}) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(
		null,
	);
	const src = mediaSrc(photo);

	const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const problem = checkPhotoFile(file);
		if (problem) {
			setMsg({ text: problem, isError: true });
			return;
		}
		setBusy(true);
		const res = await profileService.uploadPhoto("farm", file);
		setBusy(false);
		if (res.success && res.data) {
			onChanged(res.data.url);
			setMsg({ text: "Farm photo updated." });
		} else {
			setMsg({
				text: res.message || "Couldn't upload the photo.",
				isError: true,
			});
		}
	};

	const onRemove = async () => {
		setBusy(true);
		const res = await profileService.removePhoto("farm");
		setBusy(false);
		if (res.success) {
			onChanged(null);
			setMsg({ text: "Farm photo removed." });
		} else {
			setMsg({
				text: res.message || "Couldn't remove the photo.",
				isError: true,
			});
		}
	};

	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm text-[#817b70]">Bee Farm Photo</span>
			<div className="relative w-full h-40 rounded-xl overflow-hidden border border-[#e2e2e6] bg-[#f3eed8]">
				{src ? (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={src}
							alt="Bee farm"
							className="w-full h-full object-cover"
						/>
					</>
				) : (
					<div className="absolute bg-[#ffdb4f]/20 w-full h-full"></div>
				)}

				<div className="absolute bottom-2 right-2 flex gap-2">
					{photo && (
						<button
							type="button"
							onClick={onRemove}
							disabled={busy}
							className="Poppins-SemiBold text-xs bg-white/95 text-red-600 rounded-full px-3 py-1.5 shadow disabled:opacity-60">
							Remove
						</button>
					)}
					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						disabled={busy}
						className="Poppins-SemiBold text-xs bg-[#ffdb4f] text-[#4a2f00] rounded-full px-3 py-1.5 shadow flex items-center gap-1 disabled:opacity-60">
						<Icon
							icon={busy ? "eos-icons:loading" : "mdi:camera"}
							className="w-4 h-4"
						/>
						{busy
							? "Uploading…"
							: photo
								? "Change photo"
								: "Add photo"}
					</button>
				</div>
			</div>
			<input
				ref={inputRef}
				type="file"
				accept={PHOTO_ACCEPT}
				hidden
				onChange={onPick}
			/>
			<p className="text-[11px] text-[#a6a3a3]">
				Citizens see this on the Bee Farm page. JPG, PNG or WEBP, up to
				5 MB.
			</p>
			{msg && (
				<p
					className={`text-xs ${msg.isError ? "text-red-600" : "text-[#1f6f5f]"}`}>
					{msg.text}
				</p>
			)}
		</div>
	);
};

// Small red text under an input.
const FieldError = ({ text }: { text?: string | null }) =>
	text ? <p className="text-xs text-red-600 -mt-2">{text}</p> : null;

// Settings → Notification Sound: the "ding" while BeeGuard is open
// (lib/notifySound.ts). Saved on this device only.
const NotificationSoundSwitch = () => {
	const [on, setOn] = useState(true);
	useEffect(() => setOn(isSoundOn()), []);
	return (
		<SwitchTab
			label="Notification Sound"
			icon="mdi:volume-high"
			desc="Play a sound for new notifications and messages while BeeGuard is open."
			checked={on}
			onChange={(value: boolean) => {
				setOn(value);
				setSoundOn(value);
				if (value) {
					// Let them hear it right away.
					unlockNotificationSound();
					setTimeout(() => playNotificationSound("notification"), 50);
				}
			}}
		/>
	);
};

// Settings → Push Notifications: the account switch + this device.
const PushNotificationSwitch = () => {
	const [on, setOn] = useState<boolean | null>(null);
	const [device, setDevice] = useState<PushState | null>(null);
	const [busy, setBusy] = useState(false);
	const [note, setNote] = useState<{
		text: string;
		isError?: boolean;
	} | null>(null);

	useEffect(() => {
		warmUpPush();
		settingsService.get().then((res) => {
			if (res.success && res.data) setOn(res.data.push_enabled);
		});
		getPushState().then(setDevice);
	}, []);

	const toggle = async (value: boolean) => {
		if (busy) return;
		setBusy(true);
		setNote(null);
		const before = on;
		setOn(value);
		let deviceNote: string | null = null;
		if (value) {
			const res = await enablePush(); // asks the browser the first time
			setDevice(res.state);
			if (!res.ok)
				deviceNote =
					res.message ??
					"Couldn't turn on notifications on this device.";
		} else {
			await disablePush();
			setDevice(await getPushState());
		}
		const res = await settingsService.update({ push_enabled: value });
		setBusy(false);
		if (!res.success) {
			setOn(before);
			setNote({ text: res.message || "Couldn't save.", isError: true });
			return;
		}
		setNote(
			deviceNote
				? { text: deviceNote, isError: true }
				: {
						text: value
							? "Notifications are on."
							: "Notifications are off.",
					},
		);
	};

	const turnOnDevice = async () => {
		setBusy(true);
		const res = await enablePush();
		setBusy(false);
		setDevice(res.state);
		setNote(
			res.ok
				? { text: "Notifications are on for this device." }
				: {
						text: res.message ?? "Couldn't turn on notifications.",
						isError: true,
					},
		);
	};

	const test = async () => {
		setBusy(true);
		const res = await sendTestPush();
		setBusy(false);
		setNote(
			res.success
				? { text: res.message || "Test sent." }
				: {
						text: res.message || "Couldn't send a test.",
						isError: true,
					},
		);
	};

	return (
		<div className="flex flex-col gap-2">
			<SwitchTab
				label="Push Notifications"
				icon="ic:baseline-notifications"
				desc="Get alerts even when BeeGuard is closed."
				checked={on ?? false}
				onChange={toggle}
				disabled={on === null || busy}
			/>
			{/* {on &&
				device !== undefined &&
				(device === "off" || device === "on") && (
					<button
						type="button"
						onClick={device === "off" ? turnOnDevice : test}
						disabled={busy}
						className="Poppins-SemiBold self-start text-xs text-[#704500] bg-[#ffdb4f]/50 hover:bg-[#ffdb4f] rounded-full px-3 py-1.5 disabled:opacity-60">
						{device === "off"
							? busy
								? "Turning on…"
								: "Turn on for this device"
							: busy
								? "Sending…"
								: "Send a test notification"}
					</button>
				)}
			{on && device === "blocked" && (
				<p className="text-xs text-red-600">
					Notifications are blocked in this browser. Allow them in the
					site settings (icon left of the address bar), then reload.
				</p>
			)}
			{note && (
				<p
					className={`text-xs ${note.isError ? "text-red-600" : "text-[#1f6f5f]"}`}>
					{note.text}
				</p>
			)} */}
		</div>
	);
};

const MainProfileSettings = ({
	onSelect,
	onSelectDetail,
}: {
	onSelect: (view: ViewKey) => void;
	onSelectDetail: (detail: DetailKey) => void;
}) => {
	const { user, logout } = useAuth();
	const isBeekeeper = user?.role === "beekeeper";

	return (
		<Container
			height="100%"
			borderNone
			className="lg:w-[35%] w-full h-full shrink-0">
			{/* Clicking the profile opens "Verify Your Account" — beekeepers only. */}
			<ProfileDisplay
				name={user?.name ?? ""}
				email={user?.email ?? ""}
				onClick={
					isBeekeeper ? () => onSelectDetail("verify") : undefined
				}
				editablePhoto
				verificationStatus={
					isBeekeeper
						? (user?.verification_status ?? "Unverified")
						: null
				}
			/>
			<div className="w-full h-full flex justify-center mt-5">
				<div className="lg:w-2/3 w-full h-full flex flex-col gap-3">
					{settingsTab["main"]
						.filter(
							(m) =>
								m.onClickName !== "viewprofile" || isBeekeeper,
						)
						.map((m) => (
							<SettingsTabs
								key={m.onClickName}
								label={m.label}
								icon={m.icon}
								onClick={() => onSelect(m.onClickName)}
							/>
						))}
					{/* Clears the saved login before leaving */}
					<Link
						href="/"
						onClick={() => logout()}
						className="mt-auto mb-3">
						<SettingsTabs
							label="Log Out"
							icon="heroicons-outline:logout"
						/>
					</Link>
				</div>
			</div>
		</Container>
	);
};

const Settings = ({
	onSelectDetail,
}: {
	onSelectDetail: (detail: DetailKey) => void;
}) => {
	const profileRoute = useProfileRoute();

	return (
		<Container
			height="100%"
			borderNone
			className="lg:w-[35%] w-full h-full shrink-0">
			<div className="sticky top-0 z-10 flex w-full items-center justify-center px-4 pt-4 pb-6">
				<div className="fixed left-2">
					<BackButton route={profileRoute} />
				</div>
				<span className="Poppins-Bold text-3xl text-[#4a2f00]">
					Settings
				</span>
			</div>

			<div className="w-full flex flex-col items-center justify-center gap-5">
				{/* ACCOUNT */}
				<div className="lg:w-2/3 w-full flex flex-col">
					<span className="text-[#817b70]">Account</span>
					{/* TABS */}
					<div className="w-full flex flex-col items gap-3">
						{settingsTab["settings"].map((m) => (
							<SettingsTabs
								key={m.onClickName}
								label={m.label}
								icon={m.icon}
								onClick={() => onSelectDetail(m.onClickName)}
							/>
						))}
					</div>
				</div>

				{/* NOTIFICATION */}
				<div className="lg:w-2/3 w-full flex flex-col">
					<span className="text-[#817b70]">Notification</span>
					{/* TABS */}
					<div className="w-full flex flex-col items gap-3">
						<PushNotificationSwitch />
						<NotificationSoundSwitch />
					</div>
				</div>
			</div>
		</Container>
	);
};

const About = ({
	onSelectDetail,
}: {
	onSelectDetail: (detail: DetailKey) => void;
}) => {
	const profileRoute = useProfileRoute();

	return (
		<Container
			height="100%"
			borderNone
			className="lg:w-[35%] w-full h-full shrink-0">
			<div className="sticky top-0 z-10 flex w-full items-center justify-center px-4 pt-4 pb-6">
				<div className="fixed left-2">
					<BackButton route={profileRoute} />
				</div>
				<span className="Poppins-Bold text-3xl text-[#4a2f00]">
					About BeeGuard
				</span>
			</div>

			<div className="w-full h-full flex flex-col items-center justify-center gap-8">
				<div className="flex flex-col justify-center items-center lg:border-none border-b border-b-[#b6771d] lg:pb-0 pb-5">
					<h1 className="Poppins-Bold text-[#4a2f00] text-5xl mb-4 leading-3 uppercase">
						beeguard
					</h1>
					<p className="text-center text-sm text-[#545454]">
						Empowering communities to protect bees and promote a
						sustainable environment.
					</p>
				</div>

				<div className="lg:w-2/3 w-full flex flex-col gap-3">
					{settingsTab["about"].map((m) => (
						<SettingsTabs
							key={m.onClickName}
							label={m.label}
							icon={m.icon}
							onClick={() => onSelectDetail(m.onClickName)}
						/>
					))}
				</div>

				<p className="text-[#545454] mt-auto">
					© 2026 BeeGuard. All rights reserved.
				</p>
			</div>
		</Container>
	);
};

// PERSONAL INFORMATION — real data, editable (PATCH /api/profile).
// Location = a map pin (latitude/longitude only); the barangay + city
// shown under it is looked up for display.
const PersonalInfo = () => {
	const { refresh } = useAuth();
	const [profile, setProfile] = useState<MyProfile | null>(null);
	const [form, setForm] = useState<MyProfile | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [locating, setLocating] = useState(false);
	const [status, setStatus] = useState<{
		text: string;
		isError?: boolean;
	} | null>(null);

	useEffect(() => {
		profileService.get().then((res) => {
			if (res.success && res.data) {
				setProfile(res.data);
				setForm(res.data);
			} else {
				setLoadError(res.message || "Couldn't load your profile.");
			}
		});
	}, []);

	const placeName = usePlaceName(form?.latitude, form?.longitude);

	if (!form || !profile) {
		return (
			<FormContainer width="lg:w-2/3 w-full">
				<p
					className={`text-center text-sm ${loadError ? "text-red-600" : "text-[#a6a3a3]"}`}>
					{loadError ?? "Loading your profile…"}
				</p>
			</FormContainer>
		);
	}

	const isBeekeeper = profile.role === "beekeeper";
	const set = (key: keyof MyProfile, value: string | number | null) => {
		setForm((f) => (f ? { ...f, [key]: value } : f));
		setErrors((e) => {
			const next = { ...e };
			delete next[
				key === "latitude" || key === "longitude" ? "location" : key
			];
			return next;
		});
		setStatus(null);
	};

	// Only what changed is sent.
	const changes: ProfileUpdate = {};
	(
		["name", "username", "contact_no", "farm_name", "apiary_type"] as const
	).forEach((k) => {
		if (k in profile && (form[k] ?? "") !== (profile[k] ?? "")) {
			(changes as Record<string, unknown>)[k] =
				typeof form[k] === "string"
					? (form[k] as string).trim()
					: form[k];
		}
	});
	if (
		form.latitude !== profile.latitude ||
		form.longitude !== profile.longitude
	) {
		changes.latitude = form.latitude;
		changes.longitude = form.longitude;
	}
	const hasChanges = Object.keys(changes).length > 0;

	const useMyLocation = async () => {
		setLocating(true);
		const pos = await getCoordinatesOrFallback();
		setLocating(false);
		if (pos.latitude == null) {
			setErrors((e) => ({
				...e,
				location:
					"Couldn't get your location. Allow location access or tap the map.",
			}));
			return;
		}
		set("latitude", pos.latitude);
		set("longitude", pos.longitude);
	};

	const save = async () => {
		if (!hasChanges || saving) return;
		setSaving(true);
		setStatus(null);
		const res = await profileService.update(changes);
		setSaving(false);
		if (res.success && res.data) {
			setProfile(res.data);
			setForm(res.data);
			setErrors({});
			setStatus({ text: "Your profile was saved." });
			refresh(); // name / location used elsewhere in the app
		} else {
			setErrors(res.field_errors ?? {});
			setStatus({
				text: res.message || "Couldn't save your profile.",
				isError: true,
			});
		}
	};

	const pin =
		form.latitude != null && form.longitude != null
			? { lat: form.latitude, lng: form.longitude }
			: null;

	return (
		<FormContainer width="lg:w-2/3 w-full">
			<h1 className="Poppins-Bold text-[#4a2f00] text-center text-3xl">
				Personal Information
			</h1>

			<div className="flex flex-col gap-3 my-10">
				<Input
					label="Full Name"
					value={form.name ?? ""}
					onChange={(e) => set("name", e.target.value)}
					error={!!errors.name}
				/>
				<FieldError text={errors.name} />

				<Input
					label="Username"
					value={form.username ?? ""}
					onChange={(e) => set("username", e.target.value)}
					error={!!errors.username}
				/>
				<FieldError text={errors.username} />

				<Input label="Email" value={form.email ?? ""} disabled />

				{/* "+63" is fixed; only the 10 digits after it are saved */}
				<PhoneInput
					label="Phone Number"
					value={form.contact_no ?? ""}
					onChange={(digits) => set("contact_no", digits)}
					error={!!errors.contact_no}
				/>
				<FieldError text={errors.contact_no} />

				{isBeekeeper && (
					<>
						<FarmPhotoEditor
							photo={profile.farm_photo}
							onChanged={(url) => {
								setProfile((p) =>
									p ? { ...p, farm_photo: url } : p,
								);
								setForm((f) =>
									f ? { ...f, farm_photo: url } : f,
								);
							}}
						/>

						<Input
							label="Farm Name"
							value={form.farm_name ?? ""}
							onChange={(e) => set("farm_name", e.target.value)}
							error={!!errors.farm_name}
						/>
						<FieldError text={errors.farm_name} />

						<Select
							label="Apiary Type"
							options={APIARY_TYPES.map((t) => ({
								label: t,
								value: t,
							}))}
							value={form.apiary_type ?? ""}
							onSelectChange={(e) =>
								set("apiary_type", e.target.value)
							}
							error={!!errors.apiary_type}
						/>
						<FieldError text={errors.apiary_type} />
					</>
				)}

				{/* LOCATION — map pin */}
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-sm text-[#817b70]">
							{isBeekeeper ? "Farm Location" : "Location"}
						</span>
						<button
							type="button"
							onClick={useMyLocation}
							disabled={locating}
							className="Poppins-SemiBold text-xs text-[#704500] bg-[#ffdb4f]/50 hover:bg-[#ffdb4f] rounded-full px-3 py-1 disabled:opacity-60 flex items-center gap-1">
							<Icon
								icon="mdi:crosshairs-gps"
								className="w-3.5 h-3.5"
							/>
							{locating ? "Locating…" : "Use my current location"}
						</button>
					</div>
					<p className="Poppins-SemiBold text-sm text-[#4a2f00]">
						{pin
							? placeName
							: "No location pinned yet — tap the map."}
					</p>
					<div className="w-full h-56 rounded-xl relative overflow-hidden border border-[#e2e2e6]">
						<Map
							markerPosition={pin}
							initialCenter={pin ?? undefined}
							onLocationSelect={(c) => {
								set("latitude", c.lat);
								set("longitude", c.lng);
							}}
						/>
					</div>
					<p className="text-[11px] text-[#a6a3a3]">
						Tap the map to move your pin.
						{isBeekeeper &&
							" Your farm pin decides which nearby reports and pesticide alerts you get, and the distances shown."}
					</p>
					<FieldError text={errors.location} />
				</div>

				{errors._ && <FieldError text={errors._} />}
			</div>

			{status && (
				<p
					className={`text-sm text-center mb-3 ${status.isError ? "text-red-600" : "text-[#1f6f5f]"}`}>
					{status.text}
				</p>
			)}

			<Button
				label={saving ? "Saving…" : "Save Changes"}
				onClick={save}
				disabled={!hasChanges || saving}
			/>
		</FormContainer>
	);
};

// CHANGE PASSWORD — checks the current one first (POST /api/profile/password).
const ChangePassword = () => {
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [show, setShow] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState<{
		text: string;
		isError?: boolean;
	} | null>(null);

	const clear = (key: string) => {
		setErrors((e) => {
			const n = { ...e };
			delete n[key];
			return n;
		});
		setStatus(null);
	};

	const submit = async () => {
		const local: Record<string, string> = {};
		if (!current) local.current_password = "Enter your current password.";
		if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next))
			local.new_password =
				"Use at least 8 characters with letters and numbers.";
		if (next !== confirm)
			local.confirm_password = "Passwords do not match.";
		if (Object.keys(local).length) {
			setErrors(local);
			return;
		}
		setSaving(true);
		const res = await profileService.changePassword(current, next, confirm);
		setSaving(false);
		if (res.success) {
			setCurrent("");
			setNext("");
			setConfirm("");
			setErrors({});
			setStatus({ text: "Your password was changed." });
		} else {
			setErrors(res.field_errors ?? {});
			setStatus({
				text: res.message || "Couldn't change your password.",
				isError: true,
			});
		}
	};

	const type = show ? "text" : "password";

	return (
		<FormContainer width="lg:w-2/3 w-full">
			<h1 className="Poppins-Bold text-[#4a2f00] text-center text-3xl">
				Change Password
			</h1>
			<p className="text-sm text-center">
				For security please, choose a strong <br /> password that you
				don’t use elsewhere.
			</p>

			<div className="flex flex-col gap-3 my-10">
				<Input
					label="Current Password"
					type={type}
					value={current}
					onChange={(e) => {
						setCurrent(e.target.value);
						clear("current_password");
					}}
					error={!!errors.current_password}
				/>
				<FieldError text={errors.current_password} />
				<Input
					label="New Password"
					type={type}
					value={next}
					onChange={(e) => {
						setNext(e.target.value);
						clear("new_password");
					}}
					error={!!errors.new_password}
				/>
				<FieldError text={errors.new_password} />
				<Input
					label="Confirm  New Password"
					type={type}
					value={confirm}
					onChange={(e) => {
						setConfirm(e.target.value);
						clear("confirm_password");
					}}
					error={!!errors.confirm_password}
				/>
				<FieldError text={errors.confirm_password} />

				<label className="flex items-center gap-2 text-xs text-[#817b70] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={show}
						onChange={(e) => setShow(e.target.checked)}
					/>
					Show passwords
				</label>
			</div>

			{status && (
				<p
					className={`text-sm text-center mb-3 ${status.isError ? "text-red-600" : "text-[#1f6f5f]"}`}>
					{status.text}
				</p>
			)}

			<Button
				label={saving ? "Updating…" : "Update Password"}
				onClick={submit}
				disabled={saving}
			/>
		</FormContainer>
	);
};

// "Other" in the Type of Document dropdown -> type the document name.
const OTHER_DOCUMENT = "Other";
const OTHER_DOCUMENT_MAX = 60;

const VerifyBeekeeperForm = () => {
	const { user } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [info, setInfo] = useState<VerificationInfo | null>(null);
	const [documentTypes, setDocumentTypes] = useState<string[]>([]);
	const [documentType, setDocumentType] = useState("");
	// Typed name when "Other" is picked (e.g. "LGU Certification").
	const [otherDocument, setOtherDocument] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	const isBeekeeper = user?.role === "beekeeper";

	useEffect(() => {
		if (!isBeekeeper) {
			setLoading(false);
			return;
		}
		let cancelled = false;
		Promise.all([
			verificationService.mine(),
			verificationService.documentTypes(),
		]).then(([mine, types]) => {
			if (cancelled) return;
			const listed = types.success && types.data ? types.data : [];
			if (mine.success && mine.data) {
				setInfo(mine.data);
				const saved = mine.data.document_type;
				if (saved) {
					// A document typed under "Other" before -> show it there.
					if (listed.length && !listed.includes(saved)) {
						setDocumentType(OTHER_DOCUMENT);
						setOtherDocument(saved);
					} else {
						setDocumentType(saved);
					}
				}
			}
			if (listed.length) setDocumentTypes(listed);
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [isBeekeeper]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const picked = e.target.files?.[0] ?? null;
		e.target.value = "";
		setErrorMsg(null);
		setSuccessMsg(null);
		if (picked && picked.size > 10 * 1024 * 1024) {
			setErrorMsg("The file must be 10 MB or smaller.");
			return;
		}
		setFile(picked);
	};

	const handleSubmit = async () => {
		if (!documentType) {
			setErrorMsg("Please select the type of document.");
			return;
		}
		const isOther = documentType === OTHER_DOCUMENT;
		const finalType = isOther ? otherDocument.trim() : documentType;
		if (isOther && finalType.length < 3) {
			setErrorMsg("Please type the name of your document.");
			return;
		}
		if (!file) {
			setErrorMsg("Please upload your document (photo or PDF).");
			return;
		}
		setSubmitting(true);
		setErrorMsg(null);
		setSuccessMsg(null);
		const res = await verificationService.submit(finalType, file);
		setSubmitting(false);
		if (res.success && res.data) {
			setInfo(res.data);
			setFile(null);
			setSuccessMsg("Submitted! An admin will review your document.");
			// Update the badge / Sidebar without a reload.
			window.dispatchEvent(new Event(AUTH_REFRESH_EVENT));
		} else {
			setErrorMsg(res.message || "Couldn't submit your document.");
		}
	};

	if (!isBeekeeper) {
		return (
			<FormContainer width="lg:w-2/3 w-full">
				<h1 className="Poppins-Bold text-[#4a2f00] text-center text-3xl">
					Verify Your Account
				</h1>
				<p className="text-sm text-center text-[#817b70] my-10">
					Only beekeeper accounts need to be verified.
				</p>
			</FormContainer>
		);
	}

	const status = info?.status ?? user?.verification_status ?? "Unverified";
	const isVerified = status === "Verified";
	const isPending = status === "Pending";
	const isRejected = status === "Rejected";

	const formatWhen = (iso: string | null | undefined) =>
		iso
			? new Date(iso).toLocaleDateString("en-US", {
					month: "long",
					day: "numeric",
					year: "numeric",
				})
			: "";

	return (
		<FormContainer width="lg:w-2/3 w-full">
			<h1 className="Poppins-Bold text-[#4a2f00] text-center text-3xl">
				{isVerified ? "Verified Beekeeper" : "Verify Your Account"}
			</h1>

			{/* CURRENT STATUS */}
			<div className="flex flex-col items-center gap-1 mt-3">
				<VerifyStatus status={status} />
				{loading && <p className="text-xs text-[#817b70]">Loading…</p>}
				{isPending && (
					<p className="text-xs text-center text-[#817b70]">
						Your {info?.document_type ?? "document"} is being
						reviewed
						{info?.submitted_at
							? ` (submitted ${formatWhen(info.submitted_at)})`
							: ""}
						. You can upload a different file below if needed.
					</p>
				)}
				{isRejected && (
					<p className="text-xs text-center text-red-600">
						Rejected
						{info?.rejection_reason
							? `: ${info.rejection_reason}`
							: ""}
						. Please upload a new document.
					</p>
				)}
				{isVerified && (
					<p className="text-xs text-center text-[#817b70]">
						Your account is verified
						{info?.reviewed_at
							? ` since ${formatWhen(info.reviewed_at)}`
							: ""}
						. You can view bee reports and send rescue offers.
					</p>
				)}
			</div>

			<div className="flex flex-col gap-3 my-10">
				<div className="flex flex-row gap-3">
					<Input
						label="Full Name"
						value={info?.name ?? user?.name ?? ""}
						disabled
					/>
					<Input
						label="Username"
						value={user?.username ?? ""}
						disabled
					/>
				</div>
				<Input
					label="Email"
					value={info?.email ?? user?.email ?? ""}
					disabled
				/>
				<Input
					label="Phone Number"
					value={formatPhMobile(info?.contact_no)}
					disabled
				/>
				<Input label="Location" value={info?.address ?? ""} disabled />

				{/* VERIFIED — the approved document, read-only */}
				{isVerified && (
					<Input
						label="Verified Document"
						value={info?.document_type ?? "—"}
						disabled
					/>
				)}

				{!isVerified && (
					<div className="flex flex-row gap-3 items-end">
						<Select
							label="Type of Document"
							placeholder="Select Document"
							options={[
								...documentTypes.map((t) => ({
									label: t,
									value: t,
								})),
								{
									label: OTHER_DOCUMENT,
									value: OTHER_DOCUMENT,
								},
							]}
							value={documentType}
							onSelectChange={(e) => {
								setDocumentType(e.target.value);
								setErrorMsg(null);
							}}
							disabled={isVerified || submitting}
						/>

						<span
							onClick={() => {
								if (!isVerified && !submitting)
									fileInputRef.current?.click();
							}}
							className={`Poppins-SemiBold text-nowrap py-1 text-sm text-[#737373] flex items-center gap-1 ${
								isVerified
									? "opacity-50 cursor-not-allowed"
									: "cursor-pointer"
							}`}>
							Upload File{" "}
							<Icon
								icon="basil:upload-solid"
								className="w-6 h-6 mb-1"
							/>
						</span>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp,application/pdf"
							className="hidden"
							onChange={handleFileChange}
						/>
					</div>
				)}

				{/* OTHER — type the document name */}
				{!isVerified && documentType === OTHER_DOCUMENT && (
					<Input
						label="Specify Document"
						placeholder="Type the name of your document"
						value={otherDocument}
						onChange={(e) => {
							setOtherDocument(
								e.target.value.slice(0, OTHER_DOCUMENT_MAX),
							);
							setErrorMsg(null);
						}}
						disabled={submitting}
					/>
				)}

				{/* CHOSEN FILE */}
				{file && (
					<p className="text-xs text-[#4a2f00] flex items-center gap-1">
						<Icon icon="mdi:paperclip" className="w-4 h-4" />
						{file.name}
					</p>
				)}
				{!isVerified && (
					<p className="text-[11px] text-[#817b70]">
						Accepted: JPG, PNG, WEBP or PDF, up to 10 MB. Only
						admins can see your document.
					</p>
				)}

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
				{successMsg && (
					<p className="text-xs text-[#1f6f5f]">{successMsg}</p>
				)}
			</div>

			{/* VERIFIED — the Submit button becomes a "Verified Beekeeper" badge */}
			{isVerified ? (
				<div className="Poppins-Bold w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-[#8ac44f]/20 text-[#00a000] border border-[#8ac44f]/50">
					<Icon
						icon="material-symbols:verified-rounded"
						className="w-5 h-5"
					/>
					Verified Beekeeper
				</div>
			) : (
				<Button
					buttonType="button"
					label={
						submitting
							? "Submitting…"
							: isRejected || isPending
								? "Resubmit"
								: "Submit"
					}
					onClick={handleSubmit}
					disabled={submitting || loading}
				/>
			)}
		</FormContainer>
	);
};

// Yellow "Edit farm details" pill — opens Personal Information.
const EditFarmButton = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={onClick}
		className="Poppins-SemiBold text-xs text-[#704500] bg-[#ffdb4f]/50 hover:bg-[#ffdb4f] rounded-full px-4 py-2 flex items-center gap-1 shrink-0">
		<Icon icon="mdi:pencil" className="w-4 h-4" />
		Edit farm details
	</button>
);

// VIEW PROFILE — the beekeeper's Bee Farm page. Shown on the RIGHT:
// desktop = inline next to the menu, mobile = inside MobileOverlay.
// FIXED — was <BeefarmView farmId="BKP-000001" />, so EVERY beekeeper saw
// BKP-000001's ratings and followers. Now it's the logged-in beekeeper's
// own farm (GET /api/farms/<their id> -> rating_avg, rating_count,
// follower_count).
const BeekeeperFarmView = ({
	onSelectDetail,
	showTitle = true,
}: {
	onSelectDetail: (detail: DetailKey) => void;
	showTitle?: boolean;
}) => {
	const { user } = useAuth();
	return (
		<div className="w-full h-full flex flex-col min-h-0">
			{/* DESKTOP — title + Edit button on top */}
			{showTitle && (
				<div className="flex w-full items-center justify-between gap-3 lg:px-8 px-4 pt-6 pb-4 shrink-0">
					<span className="Poppins-Bold text-3xl text-[#4a2f00]">
						My Bee Farm
					</span>
					<EditFarmButton
						onClick={() => onSelectDetail("personal")}
					/>
				</div>
			)}

			<div className="w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-18 lg:scrollbar-auto scrollbar-none">
				{user?.id && <BeefarmView farmId={user.id} />}

				{/* MOBILE */}
				{!showTitle && (
					<div className="flex w-full items-center justify-center px-4 pt-3 mt-3 pb-4 shrink-0 border-t border-[#e2e2e6] bg-white">
						<EditFarmButton
							onClick={() => onSelectDetail("personal")}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

// Sticky header of the mobile overlay: back arrow + centered title.
const OverlayHeader = ({
	title,
	onBack,
}: {
	title: string;
	onBack: () => void;
}) => (
	<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6]">
		<button
			type="button"
			onClick={onBack}
			aria-label="Back"
			className="absolute flex items-center shrink-0">
			<Icon icon="bx:arrow-back" className="text-2xl text-[#ffa004]" />
		</button>
		<span className="w-full Poppins-SemiBold text-sm text-[#4a2f00] text-center">
			{title}
		</span>
	</div>
);

const ProfileSettingsContent = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const isDesktop = useIsDesktop();

	const { user } = useAuth();
	const view = (searchParams.get("view") as ViewKey) || "main";
	const detail = (searchParams.get("detail") as DetailKey) || null;

	// "View Profile" with nothing else open = show the farm on the right.
	const showFarm = view === "viewprofile" && !detail;

	const setView = (v: ViewKey) => {
		router.push(`${pathname}?view=${v}`);
	};

	const setDetail = (d: DetailKey) => {
		if (d === null) {
			router.push(`${pathname}?view=${view}`);
		} else {
			router.push(`${pathname}?view=${view}&detail=${d}`);
		}
	};

	const renderLeft = () => {
		switch (view) {
			case "settings":
				return <Settings onSelectDetail={setDetail} />;
			case "about":
				return <About onSelectDetail={setDetail} />;
			// View Profile keeps the menu on the left; the farm is a
			// "right side" page like the other details.
			case "viewprofile":
			case "main":
			default:
				return (
					<MainProfileSettings
						onSelect={setView}
						onSelectDetail={setDetail}
					/>
				);
		}
	};

	const renderDetailContent = () => {
		switch (detail) {
			case "personal":
				return <PersonalInfo />;
			case "password":
				return <ChangePassword />;
			case "privacy":
				return <PrivacyPolicyPage />;
			case "terms":
				return <TermsConditionPage />;
			case "verify":
				return <VerifyBeekeeperForm />;
			default:
				return null;
		}
	};

	const detailTitle = detail
		? detail === "verify" && user?.verification_status === "Verified"
			? "Verified Beekeeper"
			: DETAIL_TITLES[detail]
		: "";

	return (
		<div className="w-full h-full flex items-start relative">
			{renderLeft()}

			{/* RIGHT SIDE — desktop: always visible inline */}
			<div className="hidden lg:block flex-1 h-full w-full min-w-0 min-h-0 overflow-y-auto">
				{showFarm && isDesktop ? (
					<BeekeeperFarmView onSelectDetail={setDetail} />
				) : (
					<div className="flex flex-col items-center justify-center py-8 px-25 w-full h-full">
						{renderDetailContent()}
					</div>
				)}
			</div>

			{/* RIGHT SIDE — mobile: slide-up overlay for View Profile */}
			{showFarm && !isDesktop && (
				<MobileOverlay>
					<OverlayHeader
						title="My Bee Farm"
						onBack={() => setView("main")}
					/>
					<BeekeeperFarmView
						onSelectDetail={setDetail}
						showTitle={false}
					/>
				</MobileOverlay>
			)}

			{/* RIGHT SIDE — mobile: slide-up overlay, only after a tab is selected */}
			{detail && (
				<MobileOverlay>
					<OverlayHeader
						title={detailTitle}
						onBack={() => setDetail(null)}
					/>
					<div className="flex flex-col items-center py-6 px-4 w-full max-w-full overflow-x-hidden">
						{renderDetailContent()}
					</div>
				</MobileOverlay>
			)}
		</div>
	);
};

const ProfileSettingsPage = () => {
	return (
		<Suspense
			fallback={
				<div className="w-full h-full flex items-center justify-center">
					Loading...
				</div>
			}>
			<ProfileSettingsContent />
		</Suspense>
	);
};

export default ProfileSettingsPage;
