// lib/offlineSync.ts
//
// OFFLINE MODE — sends the changes saved while offline (the outbox),
// oldest first, once the internet is back. Started by
// components/OfflineBanner.tsx: on page load, when the phone comes back
// online, and every 30 seconds while something is waiting.

import { currentUserKey, sendQueued } from "@/services/api";
import { outbox, OutboxItem } from "@/lib/offlineDb";
import {
	OFFLINE_SYNCED_EVENT,
	OUTBOX_CHANGED_EVENT,
	reportNetworkError,
	reportReachedServer,
	reportSyncing,
} from "@/lib/offlineStatus";

export interface SyncFailure {
	label: string;
	message: string;
	at: string;
}

// The server refused a saved change (e.g. the hive was deleted in the
// meantime). Kept so the banner can tell the beekeeper what didn't go
// through — the change itself is dropped, retrying would fail again.
const failuresKey = (userKey: string) => `beeguard_sync_failed_${userKey}`;

export const getSyncFailures = (): SyncFailure[] => {
	if (typeof window === "undefined") return [];
	try {
		return JSON.parse(
			localStorage.getItem(failuresKey(currentUserKey())) || "[]",
		) as SyncFailure[];
	} catch {
		return [];
	}
};

export const clearSyncFailures = () => {
	try {
		localStorage.removeItem(failuresKey(currentUserKey()));
	} catch {
		/* ignore */
	}
	window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
};

const addFailure = (userKey: string, f: SyncFailure) => {
	try {
		const list = JSON.parse(
			localStorage.getItem(failuresKey(userKey)) || "[]",
		) as SyncFailure[];
		list.push(f);
		localStorage.setItem(failuresKey(userKey), JSON.stringify(list.slice(-20)));
	} catch {
		/* ignore */
	}
};

export const listPending = (): Promise<OutboxItem[]> => {
	const userKey = currentUserKey();
	if (userKey === "anon") return Promise.resolve([]);
	return outbox.list(userKey);
};

// Login problems: keep the changes and wait until the user signs in again.
const LOGIN_PROBLEMS = [
	"Token has expired.",
	"Invalid token.",
	"Missing or invalid Authorization header.",
];

let running = false;

export async function flushOutbox(): Promise<{ sent: number; remaining: number }> {
	const userKey = currentUserKey();
	if (running || userKey === "anon") return { sent: 0, remaining: 0 };
	if (typeof navigator !== "undefined" && navigator.onLine === false) {
		const waiting = await outbox.list(userKey);
		return { sent: 0, remaining: waiting.length };
	}

	const items = await outbox.list(userKey);
	if (items.length === 0) return { sent: 0, remaining: 0 };

	running = true;
	reportSyncing(true);
	let sent = 0;
	let changed = false;

	try {
		for (const item of items) {
			const r = await sendQueued(item.method, item.path, item.body);

			// Still no connection -> stop, try again later.
			if (!r.reached) {
				reportNetworkError();
				break;
			}
			reportReachedServer();

			// Signed out / login expired -> keep everything for later.
			if (!r.body.success && LOGIN_PROBLEMS.includes(r.body.message)) break;

			// Server error -> keep it and try again later.
			if (r.status >= 500) break;

			if (item.id !== undefined) await outbox.remove(item.id);
			changed = true;

			if (r.body.success) {
				sent += 1;
			} else {
				addFailure(userKey, {
					label: item.label,
					message: r.body.message || "The server didn't accept this change.",
					at: new Date().toISOString(),
				});
			}
		}
	} finally {
		running = false;
		reportSyncing(false);
		if (changed) window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
		if (sent > 0) window.dispatchEvent(new Event(OFFLINE_SYNCED_EVENT));
	}

	const remaining = (await outbox.list(userKey)).length;
	return { sent, remaining };
}