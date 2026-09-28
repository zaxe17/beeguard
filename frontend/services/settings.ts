// services/settings.ts
//
// More → Settings page (routes/settings.py).

import { api, tokenStore } from "./api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface NotificationSettings {
	push_enabled: boolean;
	report_updates: boolean;
	nearby_farm_alerts: boolean;
	educational_updates: boolean;
	system_announcements: boolean;
}

export interface SystemSettings {
	auto_backup: boolean;
}

export interface BackupInfo {
	name: string; // e.g. beeguard_2026-09-28_13-20-05_manual.sql
	kind: "manual" | "auto" | "pre-restore";
	created_at: string; // ISO
	size_bytes: number; // the .sql file (used for Restore)
	// Excel copy of the same backup (Summary + one sheet per table)
	has_excel: boolean;
	excel_name: string | null;
	excel_size_bytes: number | null;
}

export const settingsService = {
	// My notification switches
	get: () => api.get<NotificationSettings>("/settings"),
	update: (changes: Partial<NotificationSettings>) =>
		api.patch<NotificationSettings>("/settings", changes),

	// Admin — app-wide settings (automatic backup)
	getSystem: () => api.get<SystemSettings>("/settings/system"),
	updateSystem: (changes: Partial<SystemSettings>) =>
		api.patch<SystemSettings>("/settings/system", changes),

	// Admin — backups
	listBackups: () => api.get<BackupInfo[]>("/settings/backups"),
	backupNow: () => api.post<BackupInfo>("/settings/backups", {}),
	restore: (name: string) =>
		api.post<{ restored: string; safety_backup: BackupInfo }>(
			`/settings/backups/${encodeURIComponent(name)}/restore`,
			{ confirm: "RESTORE" },
		),

	// Admin — save a backup to the computer as EXCEL (.xlsx). Older
	// backups get their Excel file made by the server on first download.
	// Needs the login token, so it's fetched here instead of a plain link.
	download: async (backup: BackupInfo): Promise<boolean> => {
		const fmt = "xlsx";
		const name = backup.excel_name ?? backup.name.replace(/\.sql$/, ".xlsx");
		try {
			const token = tokenStore.get();
			const res = await fetch(
				`${BASE_URL}/api/settings/backups/${encodeURIComponent(backup.name)}/download?format=${fmt}`,
				{ headers: token ? { Authorization: `Bearer ${token}` } : {} },
			);
			if (!res.ok) return false;
			const url = URL.createObjectURL(await res.blob());
			const a = document.createElement("a");
			a.href = url;
			a.download = name;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			return true;
		} catch {
			return false;
		}
	},
};

/** "May 27, 2026 • 10:45 AM" */
export const formatBackupDate = (iso: string) => {
	const d = new Date(iso);
	return `${d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	})} • ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};

export const formatSize = (bytes: number) =>
	bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / (1024 * 1024)).toFixed(1)} MB`;