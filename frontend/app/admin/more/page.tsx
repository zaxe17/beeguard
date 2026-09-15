"use client";

import { Suspense } from "react";
import { TermsConditionPage } from "@/components/Page/TermsCondition";
import { SettingsTabs, SwitchTab } from "@/components/Tab";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon } from "@iconify/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ViewKey = "main" | "notification" | "backuprestore" | "about";
type DetailKey = "notification" | "backuprestore" | "about" | null;

// NOTIFICATION SETTINGS
const Notification = () => {
	return (
		<div className="w-2/3 flex flex-col">
			<SwitchTab
				label="Push Notifications"
				desc="Receive notifications about your reports, and updates."
				icon="ic:baseline-notifications"
			/>

			<span className="text-[#817b70] mt-10">
				Notification Preferences
			</span>
			<div className="flex flex-col gap-3">
				<SwitchTab
					label="New Report Updates"
					desc="Get notified when the re are updates on your reports."
					icon="boxicons:file-report-filled"
				/>
				<SwitchTab
					label="Nearby Farm Alerts"
					desc="Get alerts about nearby farms and activities."
					icon="mdi:alert"
				/>
				<SwitchTab
					label="Educational Updates"
					desc="Receive tips, guide, and educational content."
					icon="heroicons:academic-cap-solid"
				/>
				<SwitchTab
					label="System Announcements"
					desc="Get alerts about nearby farms and activities."
					icon="streamline-plump:announcement-megaphone-solid"
				/>
			</div>
		</div>
	);
};

// BACK AND RESTORE
const BackupRestore = () => {
	return (
		<div className="w-2/3 flex flex-col gap-3">
			<SettingsTabs
				label="Manual Backup"
				desc="Create a backup of your data manually."
				icon="material-symbols:backup-outline-rounded"
				subContent={
					<Button
						label="Back Up Data Now"
						textSize="text-xs"
						width="w-fit"
					/>
				}
			/>
			<SettingsTabs
				label="Last Backup"
				desc="View the date and time of your most recent backup."
				icon="boxicons:calendar-alt"
				subContent={
					<span className="Poppins-SemiBold text-[#ffce1c] text-xs bg-[#ffdb4f]/30 py-1 px-2 rounded-md flex items-center gap-1 w-fit">
						<Icon
							icon="bx:time"
							className="w-4 h-4 text-[#ffce1c]"
						/>
						Last Backup: May 27, 2026 • 10:45 AM
					</span>
				}
			/>
			<SwitchTab
				label="Automatic Backup"
				desc="Enable automatic backups to keep your data safe and up to date."
				icon="ix:restore-backup-filled"
			/>
			<SettingsTabs
				label="Restore Backup"
				desc="Restore your data from a previous backup."
				icon="iconmind:rollback-outline-regular"
				subContent={
					<Button
						label="Restore Backup"
						textSize="text-xs"
						width="w-fit"
					/>
				}
			/>
		</div>
	);
};

const MorePageContent = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const view = (searchParams.get("view") as ViewKey) || "main";
	const content = (searchParams.get("content") as DetailKey) || null;

	const setContent = (d: DetailKey) => {
		router.push(`${pathname}?view=${view}&content=${d}`);
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
				<div className="w-full flex justify-center mt-5">
					<div className="w-4/5 flex flex-col gap-3">
						<SettingsTabs
							label="Notification Settings"
							icon="ic:baseline-notifications"
							desc="Configure system notification"
							onClick={() => setContent("notification")}
						/>
						<SettingsTabs
							label="Backup & Restore"
							icon="carbon:ibm-cloud-backup-and-recovery"
							desc="Manage system back up"
							onClick={() => setContent("backuprestore")}
						/>
						<SettingsTabs
							label="About BeeGuard"
							icon="fa7-solid:circle-info"
							onClick={() => setContent("about")}
						/>
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
