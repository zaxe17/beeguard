// components/OfflineBanner.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";

import {
	getOfflineStatus,
	OFFLINE_STATUS_EVENT,
	OfflineStatus,
	OUTBOX_CHANGED_EVENT,
	reportNetworkError,
} from "@/lib/offlineStatus";
import {
	clearSyncFailures,
	flushOutbox,
	getSyncFailures,
	listPending,
	SyncFailure,
} from "@/lib/offlineSync";
import { OutboxItem } from "@/lib/offlineDb";

/**
 * OFFLINE MODE banner (beekeeper side — see app/beekeeper/layout.tsx).
 *   - "You're offline — showing data saved Sep 28, 3:15 PM"
 *   - "2 changes waiting to sync" (tap to see which) + Sync now
 *   - "Syncing…" while they're being sent
 *   - anything the server refused, with Dismiss
 * Also starts the sync: on load, when the phone comes back online, and
 * every 30s while something is waiting.
 */

const RETRY_MS = 30000;

type Props = {
	// Called when the phone comes back online, so pages reload live data.
	onBackOnline?: () => void;
	// Pages to save for offline use (opened once in the background while
	// online, so they still open with no internet).
	warmRoutes?: string[];
};

const formatSaved = (iso: string) =>
	new Date(iso).toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});

export const OfflineBanner = ({ onBackOnline, warmRoutes = [] }: Props) => {
	const [status, setStatus] = useState<OfflineStatus>(getOfflineStatus());
	const [pending, setPending] = useState<OutboxItem[]>([]);
	const [failures, setFailures] = useState<SyncFailure[]>([]);
	const [showList, setShowList] = useState(false);

	const reloadOutbox = useCallback(async () => {
		setPending(await listPending());
		setFailures(getSyncFailures());
	}, []);

	// Status + outbox listeners
	useEffect(() => {
		const onStatus = (e: Event) =>
			setStatus((e as CustomEvent<OfflineStatus>).detail);
		window.addEventListener(OFFLINE_STATUS_EVENT, onStatus);
		window.addEventListener(OUTBOX_CHANGED_EVENT, reloadOutbox);
		reloadOutbox();
		return () => {
			window.removeEventListener(OFFLINE_STATUS_EVENT, onStatus);
			window.removeEventListener(OUTBOX_CHANGED_EVENT, reloadOutbox);
		};
	}, [reloadOutbox]);

	// Phone's own online/offline signal
	useEffect(() => {
		if (!navigator.onLine) reportNetworkError();

		const goOffline = () => reportNetworkError();
		const goOnline = () => {
			flushOutbox();
			onBackOnline?.();
		};
		window.addEventListener("offline", goOffline);
		window.addEventListener("online", goOnline);
		return () => {
			window.removeEventListener("offline", goOffline);
			window.removeEventListener("online", goOnline);
		};
	}, [onBackOnline]);

	// Send waiting changes on load, then retry every 30s while any wait.
	useEffect(() => {
		flushOutbox();
	}, []);

	useEffect(() => {
		if (pending.length === 0) return;
		const t = setInterval(() => flushOutbox(), RETRY_MS);
		return () => clearInterval(t);
	}, [pending.length]);

	// Save the main pages for offline use (production build only — the
	// service worker is off in `npm run dev`). Once per browser session.
	useEffect(() => {
		if (warmRoutes.length === 0 || !("serviceWorker" in navigator)) return;
		const KEY = "beeguard_offline_pages_saved";
		try {
			if (sessionStorage.getItem(KEY)) return;
		} catch {
			return;
		}

		const t = setTimeout(async () => {
			if (!navigator.onLine || !navigator.serviceWorker.controller) return;
			for (const route of warmRoutes) {
				try {
					await fetch(route, { credentials: "same-origin" });
				} catch {
					/* offline or blocked — skip */
				}
			}
			try {
				sessionStorage.setItem(KEY, "1");
			} catch {
				/* ignore */
			}
		}, 5000);
		return () => clearTimeout(t);
	}, [warmRoutes]);

	const count = pending.length;
	const plural = count === 1 ? "change" : "changes";

	if (!status.offline && !status.syncing && count === 0 && failures.length === 0) {
		return null;
	}

	return (
		<div className="w-full flex flex-col gap-1 px-3 pt-2 text-xs">
			{/* OFFLINE */}
			{status.offline && (
				<div className="w-full flex items-center gap-2 rounded-lg p-2 bg-[#FAEEDA] border border-[#FAC775] text-[#854F0B]">
					<Icon icon="material-symbols:wifi-off-rounded" className="w-4 h-4 shrink-0" />
					<span className="Poppins-SemiBold">
						You&apos;re offline
						{status.showingSavedFrom
							? ` — showing data saved ${formatSaved(status.showingSavedFrom)}`
							: ""}
						.
					</span>
				</div>
			)}

			{/* WAITING TO SYNC / SYNCING */}
			{(count > 0 || status.syncing) && (
				<div className="w-full rounded-lg p-2 bg-[#fff8e1] border border-[#ffdb4f] text-[#4a2f00]">
					<div className="flex items-center gap-2">
						<Icon
							icon={status.syncing ? "line-md:loading-loop" : "mdi:cloud-upload-outline"}
							className="w-4 h-4 shrink-0"
						/>
						<span className="Poppins-SemiBold">
							{status.syncing
								? "Syncing offline changes…"
								: `${count} ${plural} saved on this phone, waiting to sync`}
						</span>
						{count > 0 && (
							<button
								type="button"
								onClick={() => setShowList((s) => !s)}
								className="underline ml-auto">
								{showList ? "Hide" : "Show"}
							</button>
						)}
						{count > 0 && !status.offline && !status.syncing && (
							<button
								type="button"
								onClick={() => flushOutbox()}
								className="underline">
								Sync now
							</button>
						)}
					</div>
					{showList && count > 0 && (
						<ul className="mt-1 ml-6 list-disc">
							{pending.map((p) => (
								<li key={p.id}>
									{p.label}{" "}
									<span className="text-[#817b70]">
										({formatSaved(p.createdAt)})
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{/* REFUSED BY THE SERVER */}
			{failures.length > 0 && (
				<div className="w-full rounded-lg p-2 bg-[#ffecec] border border-[#ff9b9b] text-[#a10000]">
					<div className="flex items-center gap-2">
						<Icon icon="octicon:alert-16" className="w-4 h-4 shrink-0" />
						<span className="Poppins-SemiBold">
							{failures.length === 1
								? "1 offline change couldn't be saved"
								: `${failures.length} offline changes couldn't be saved`}
						</span>
						<button
							type="button"
							onClick={clearSyncFailures}
							className="underline ml-auto">
							Dismiss
						</button>
					</div>
					<ul className="mt-1 ml-6 list-disc">
						{failures.map((f, i) => (
							<li key={i}>
								{f.label} — {f.message}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};