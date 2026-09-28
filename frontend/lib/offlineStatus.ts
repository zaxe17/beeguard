// lib/offlineStatus.ts
//
// OFFLINE MODE — one shared "are we offline?" state for the whole app.
// services/api.ts updates it after every request; the OfflineBanner
// (components/OfflineBanner.tsx) listens to OFFLINE_STATUS_EVENT.
// No imports on purpose, so anything can use it without import cycles.

export const OFFLINE_STATUS_EVENT = "beeguard:offline-status";
// The list of changes waiting to be sent changed (added / sent / failed).
export const OUTBOX_CHANGED_EVENT = "beeguard:outbox-changed";
// At least one offline change was just saved on the server — pages
// should reload their data (the beekeeper layout turns this into
// HIVES_CHANGED_EVENT / ALERTS_CHANGED_EVENT).
export const OFFLINE_SYNCED_EVENT = "beeguard:offline-synced";

export interface OfflineStatus {
	// true = the last request couldn't reach the server
	offline: boolean;
	// oldest "saved at" time of the saved data being shown (null = live data)
	showingSavedFrom: string | null;
	// offline changes are being sent right now
	syncing: boolean;
}

let status: OfflineStatus = {
	offline: false,
	showingSavedFrom: null,
	syncing: false,
};

export const getOfflineStatus = () => status;

const setStatus = (patch: Partial<OfflineStatus>) => {
	const next = { ...status, ...patch };
	if (
		next.offline === status.offline &&
		next.showingSavedFrom === status.showingSavedFrom &&
		next.syncing === status.syncing
	) {
		return;
	}
	status = next;
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent<OfflineStatus>(OFFLINE_STATUS_EVENT, { detail: status }),
		);
	}
};

// A request got an answer from the server -> online, live data.
export const reportReachedServer = () =>
	setStatus({ offline: false, showingSavedFrom: null });

// Couldn't reach the server (no saved copy to show, or a change was queued).
export const reportNetworkError = () => setStatus({ offline: true });

// Showing a saved copy instead of live data.
export const reportServedFromCache = (savedAt: string) => {
	const oldest =
		status.showingSavedFrom &&
		new Date(status.showingSavedFrom).getTime() < new Date(savedAt).getTime()
			? status.showingSavedFrom
			: savedAt;
	setStatus({ offline: true, showingSavedFrom: oldest });
};

export const reportSyncing = (syncing: boolean) => setStatus({ syncing });