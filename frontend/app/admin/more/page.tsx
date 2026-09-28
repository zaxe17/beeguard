"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { TermsConditionPage } from "@/components/Page/TermsCondition";
import { SettingsTabs, SwitchTab } from "@/components/Tab";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon } from "@iconify/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
	settingsService,
	formatBackupDate,
	formatSize,
	type BackupInfo,
	type NotificationSettings,
} from "@/services/settings";
import {
	disablePush,
	enablePush,
	getPushState,
	sendTestPush,
	warmUpPush,
	type PushState,
} from "@/services/push";

type ViewKey = "main" | "notification" | "backuprestore" | "about";
type DetailKey = "notification" | "backuprestore" | "about" | null;

// Small status line under a section ("Saved", errors).
const StatusLine = ({ text, isError }: { text: string | null; isError?: boolean }) =>
	text ? (
		<p className={`text-xs mt-2 ${isError ? "text-red-600" : "text-[#1f6f5f]"}`}>{text}</p>
	) : null;

// NOTIFICATION SETTINGS — saved per account (GET/PATCH /api/settings)
const Notification = () => {
	const [settings, setSettings] = useState<NotificationSettings | null>(null);
	const [status, setStatus] = useState<{ text: string; isError?: boolean } | null>(null);

	useEffect(() => {
		settingsService.get().then((res) => {
			if (res.success && res.data) setSettings(res.data);
			else setStatus({ text: res.message || "Couldn't load your settings.", isError: true });
		});
	}, []);

	const [testing, setTesting] = useState(false);
	// Push on THIS browser/device (the switch above is for the account).
	const [deviceState, setDeviceState] = useState<PushState | null>(null);
	const [deviceBusy, setDeviceBusy] = useState(false);

	useEffect(() => {
		warmUpPush(); // get the key + service worker ready before the tap
		getPushState().then(setDeviceState);
	}, []);

	const turnOnThisDevice = async () => {
		setDeviceBusy(true);
		const res = await enablePush();
		setDeviceBusy(false);
		setDeviceState(res.state);
		setStatus(
			res.ok
				? { text: "Notifications are on for this device." }
				: { text: res.message ?? "Couldn't turn on notifications.", isError: true },
		);
	};

	// Flip the switch right away; put it back if saving fails.
	const change = async (key: keyof NotificationSettings, value: boolean) => {
		if (!settings) return;

		// The master switch also turns push on/off for THIS device
		// (asks the browser for permission the first time).
		let deviceNote: string | null = null;
		if (key === "push_enabled") {
			if (value) {
				const res = await enablePush();
				setDeviceState(res.state);
				if (!res.ok) deviceNote = res.message ?? "Couldn't turn on notifications on this device.";
			} else {
				await disablePush();
				setDeviceState(await getPushState());
			}
		}

		const before = settings;
		setSettings({ ...settings, [key]: value });
		setStatus(null);
		const res = await settingsService.update({ [key]: value });
		if (res.success && res.data) {
			setSettings(res.data);
			setStatus(deviceNote ? { text: deviceNote, isError: true } : { text: "Saved." });
		} else {
			setSettings(before);
			setStatus({ text: res.message || "Couldn't save. Please try again.", isError: true });
		}
	};

	if (!settings) {
		return (
			<div className="w-2/3 flex flex-col">
				{status ? (
					<StatusLine text={status.text} isError={status.isError} />
				) : (
					<p className="text-sm text-[#a6a3a3]">Loading settings…</p>
				)}
			</div>
		);
	}

	const off = !settings.push_enabled;

	const sendTest = async () => {
		setTesting(true);
		const res = await sendTestPush();
		setTesting(false);
		setStatus(
			res.success
				? { text: res.message || "Test notification sent." }
				: { text: res.message || "Couldn't send a test notification.", isError: true },
		);
	};

	return (
		<div className="w-2/3 flex flex-col">
			<SwitchTab
				label="Push Notifications"
				desc="Receive notifications about your reports, and updates."
				icon="ic:baseline-notifications"
				checked={settings.push_enabled}
				onChange={(v) => change("push_enabled", v)}
			/>
			{/* THIS DEVICE — the account switch is on, but each browser/phone
			    must also be allowed once before it can show notifications. */}
			{!off && deviceState === "on" && (
				<div className="flex items-center gap-2 mt-2">
					<span className="text-xs text-[#1f6f5f] flex items-center gap-1">
						<Icon icon="mdi:check-circle" className="w-4 h-4" />
						On for this device
					</span>
					<button
						type="button"
						onClick={sendTest}
						disabled={testing}
						className="Poppins-SemiBold text-xs text-[#704500] bg-[#ffdb4f]/50 hover:bg-[#ffdb4f] rounded-full px-3 py-1.5 disabled:opacity-60">
						{testing ? "Sending…" : "Send a test notification"}
					</button>
				</div>
			)}
			{!off && deviceState === "off" && (
				<div className="flex items-center gap-2 mt-2">
					<span className="text-xs text-[#854F0B]">Not on for this device yet.</span>
					<button
						type="button"
						onClick={turnOnThisDevice}
						disabled={deviceBusy}
						className="Poppins-SemiBold text-xs text-[#704500] bg-[#ffdb4f]/50 hover:bg-[#ffdb4f] rounded-full px-3 py-1.5 disabled:opacity-60">
						{deviceBusy ? "Turning on…" : "Turn on for this device"}
					</button>
				</div>
			)}
			{!off && deviceState === "blocked" && (
				<span className="text-xs text-red-600 mt-2">
					Notifications are blocked in this browser. Click the icon at the left of the
					address bar → Site settings → Notifications → Allow, then reload.
				</span>
			)}
			{!off && deviceState === "unsupported" && (
				<span className="text-xs text-[#a6a3a3] mt-2">
					This browser can&apos;t show notifications. On iPhone, add BeeGuard to your Home
					Screen first.
				</span>
			)}
			{!off && deviceState === "not-configured" && (
				<span className="text-xs text-[#a6a3a3] mt-2">
					Push isn&apos;t set up on the server yet (VAPID keys missing in server/.env).
				</span>
			)}

			<span className="text-[#817b70] mt-10">Notification Preferences</span>
			{off && (
				<span className="text-xs text-[#a6a3a3] mb-2">
					Turn on Push Notifications to choose which ones you get.
				</span>
			)}
			<div className="flex flex-col gap-3">
				<SwitchTab
					label="New Report Updates"
					desc="Get notified when there are updates on reports."
					icon="boxicons:file-report-filled"
					checked={settings.report_updates}
					onChange={(v) => change("report_updates", v)}
					disabled={off}
				/>
				<SwitchTab
					label="Nearby Farm Alerts"
					desc="Get alerts about nearby farms and activities."
					icon="mdi:alert"
					checked={settings.nearby_farm_alerts}
					onChange={(v) => change("nearby_farm_alerts", v)}
					disabled={off}
				/>
				<SwitchTab
					label="Educational Updates"
					desc="Receive tips, guide, and educational content."
					icon="heroicons:academic-cap-solid"
					checked={settings.educational_updates}
					onChange={(v) => change("educational_updates", v)}
					disabled={off}
				/>
				<SwitchTab
					label="System Announcements"
					desc="Get important updates and announcements from BeeGuard."
					icon="streamline-plump:announcement-megaphone-solid"
					checked={settings.system_announcements}
					onChange={(v) => change("system_announcements", v)}
					disabled={off}
				/>
			</div>

			<StatusLine text={status?.text ?? null} isError={status?.isError} />
		</div>
	);
};

const KIND_LABEL: Record<BackupInfo["kind"], string> = {
	manual: "Manual",
	auto: "Automatic",
	"pre-restore": "Before restore",
};

// BACK UP AND RESTORE — admin only (/api/settings/backups, /system)
const BackupRestore = () => {
	const [backups, setBackups] = useState<BackupInfo[]>([]);
	const [autoBackup, setAutoBackup] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [status, setStatus] = useState<{ text: string; isError?: boolean } | null>(null);

	const load = useCallback(async () => {
		const [list, system] = await Promise.all([
			settingsService.listBackups(),
			settingsService.getSystem(),
		]);
		if (list.success && list.data) setBackups(list.data);
		else setStatus({ text: list.message || "Couldn't load backups.", isError: true });
		if (system.success && system.data) setAutoBackup(system.data.auto_backup);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const latest = backups[0] ?? null;

	const backupNow = async () => {
		setBusy("backup");
		setStatus(null);
		const res = await settingsService.backupNow();
		setBusy(null);
		if (res.success) {
			setStatus({ text: "Backup saved." });
			load();
		} else {
			setStatus({ text: res.message || "Backup failed.", isError: true });
		}
	};

	const toggleAuto = async (v: boolean) => {
		const before = autoBackup;
		setAutoBackup(v);
		const res = await settingsService.updateSystem({ auto_backup: v });
		if (res.success && res.data) {
			setAutoBackup(res.data.auto_backup);
			setStatus({
				text: v
					? "Automatic backup is on — a backup is made once a day."
					: "Automatic backup is off.",
			});
		} else {
			setAutoBackup(before);
			setStatus({ text: res.message || "Couldn't save.", isError: true });
		}
	};

	const restore = async () => {
		if (!selected) return;
		setBusy("restore");
		setStatus(null);
		const res = await settingsService.restore(selected);
		setBusy(null);
		setConfirming(false);
		if (res.success) {
			setStatus({ text: res.message || "Backup restored." });
			setSelected(null);
			load();
		} else {
			setStatus({ text: res.message || "Restore failed.", isError: true });
		}
	};

	const download = async (backup: BackupInfo) => {
		const ok = await settingsService.download(backup);
		if (!ok)
			setStatus({
				text: "Couldn't download the Excel file. Make sure openpyxl is installed on the server (pip install openpyxl).",
				isError: true,
			});
	};

	return (
		<div className="w-2/3 flex flex-col gap-3">
			<SettingsTabs
				label="Manual Backup"
				desc="Create a backup of your data manually."
				icon="material-symbols:backup-outline-rounded"
				subContent={
					<Button
						label={busy === "backup" ? "Backing up…" : "Back Up Data Now"}
						textSize="text-xs"
						width="w-fit"
						onClick={backupNow}
						disabled={!!busy}
					/>
				}
			/>
			<SettingsTabs
				label="Last Backup"
				desc="View the date and time of your most recent backup."
				icon="boxicons:calendar-alt"
				subContent={
					<span className="Poppins-SemiBold text-[#ffce1c] text-xs bg-[#ffdb4f]/30 py-1 px-2 rounded-md flex items-center gap-1 w-fit">
						<Icon icon="bx:time" className="w-4 h-4 text-[#ffce1c]" />
						{loading
							? "Loading…"
							: latest
								? `Last Backup: ${formatBackupDate(latest.created_at)}`
								: "No backups yet"}
					</span>
				}
			/>
			<SwitchTab
				label="Automatic Backup"
				desc="Enable automatic backups to keep your data safe and up to date."
				icon="ix:restore-backup-filled"
				checked={autoBackup ?? false}
				onChange={toggleAuto}
				disabled={autoBackup === null}
			/>
			<SettingsTabs
				label="Restore Backup"
				desc="Restore your data from a previous backup."
				icon="iconmind:rollback-outline-regular"
				subContent={
					<div className="flex flex-col gap-2 normal-case">
						{backups.length === 0 ? (
							<span className="text-xs text-[#a6a3a3]">No backups to restore yet.</span>
						) : (
							<div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
								{backups.map((b) => (
									<label
										key={b.name}
										className={`flex items-center gap-2 text-xs rounded-md px-2 py-1 cursor-pointer ${
											selected === b.name ? "bg-[#ffdb4f]/30" : "hover:bg-[#fff4c7]"
										}`}>
										<input
											type="radio"
											name="backup"
											checked={selected === b.name}
											onChange={() => {
												setSelected(b.name);
												setConfirming(false);
											}}
										/>
										<span className="Poppins-SemiBold text-[#4a2f00]">
											{formatBackupDate(b.created_at)}
										</span>
										<span className="text-[#a6a3a3]">
											{KIND_LABEL[b.kind]} •{" "}
											{formatSize(b.has_excel && b.excel_size_bytes ? b.excel_size_bytes : b.size_bytes)}
										</span>
										<button
											type="button"
											title="Download as Excel (.xlsx)"
											onClick={(e) => {
												e.preventDefault();
												download(b);
											}}
											className="ml-auto flex items-center gap-0.5 text-[#1f6f5f] hover:text-[#ff9a00]">
											<Icon icon="vscode-icons:file-type-excel" className="w-4 h-4" />
											<span className="text-[10px] Poppins-SemiBold">Excel</span>
										</button>
									</label>
								))}
							</div>
						)}

						{confirming && selected ? (
							<div className="flex flex-col gap-2 bg-red-50 border border-red-200 rounded-md p-2">
								<span className="text-xs text-red-600">
									This replaces <b>all current data</b> with the backup from{" "}
									{formatBackupDate(
										backups.find((b) => b.name === selected)?.created_at ?? "",
									)}
									. Your current data is saved first as a &quot;Before restore&quot;
									backup, so you can undo this.
								</span>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setConfirming(false)}
										disabled={busy === "restore"}
										className="Poppins-SemiBold text-xs py-1.5 px-3 rounded-lg border border-[#a6a3a3] text-[#817b70]">
										Cancel
									</button>
									<button
										type="button"
										onClick={restore}
										disabled={busy === "restore"}
										className="Poppins-SemiBold text-xs py-1.5 px-3 rounded-lg bg-red-600 text-white disabled:opacity-50">
										{busy === "restore" ? "Restoring…" : "Yes, restore"}
									</button>
								</div>
							</div>
						) : (
							<Button
								label="Restore Backup"
								textSize="text-xs"
								width="w-fit"
								onClick={() => setConfirming(true)}
								disabled={!selected || !!busy}
							/>
						)}
					</div>
				}
			/>

			<StatusLine text={status?.text ?? null} isError={status?.isError} />
		</div>
	);
};

const MorePageContent = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { logout } = useAuth();

	const view = (searchParams.get("view") as ViewKey) || "main";
	const content = (searchParams.get("content") as DetailKey) || null;

	const setContent = (d: DetailKey) => {
		router.push(`${pathname}?view=${view}&content=${d}`);
	};

	// Actually signs out (clears the saved login), then goes to the start page.
	const handleLogout = () => {
		logout();
		router.replace("/");
	};

	const renderRight = () => {
		switch (content) {
			case "notification":
				return <Notification />;
			case "backuprestore":
				return <BackupRestore />;
			case "about":
				return <TermsConditionPage />;
			default:
				return null;
		}
	};

	return (
		<div className="w-full h-full flex items-start relative">
			<Container
				height="100%"
				borderNone
				className="lg:w-[35%] w-full h-full shrink-0">
				<div className="w-full h-full flex justify-center mt-5">
					<div className="w-4/5 h-full flex flex-col gap-3">
						<SettingsTabs
							label="Notification Settings"
							icon="ic:baseline-notifications"
							desc="Configure system notification"
							onClick={() => setContent("notification")}
							active={content === "notification"}
						/>
						<SettingsTabs
							label="Backup & Restore"
							icon="carbon:ibm-cloud-backup-and-recovery"
							desc="Manage system back up"
							onClick={() => setContent("backuprestore")}
							active={content === "backuprestore"}
						/>
						<SettingsTabs
							label="About BeeGuard"
							icon="fa7-solid:circle-info"
							onClick={() => setContent("about")}
							active={content === "about"}
						/>
						<div className="mt-auto mb-10">
							<SettingsTabs
								label="Log Out"
								icon="heroicons-outline:logout"
								onClick={handleLogout}
							/>
						</div>
					</div>
				</div>
			</Container>

			<div className="hidden lg:block flex-1 h-full w-full min-h-0 overflow-y-auto">
				<div className="flex flex-col items-center justify-center py-8 px-25 w-full h-full">
					{renderRight()}
				</div>
			</div>
		</div>
	);
};

const MorePage = () => {
	return (
		<Suspense
			fallback={
				<div className="w-full h-full flex items-center justify-center">
					Loading...
				</div>
			}>
			<MorePageContent />
		</Suspense>
	);
};

export default MorePage;