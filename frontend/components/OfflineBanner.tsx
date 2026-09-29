// components/OfflineBanner.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

import {
	getOfflineStatus,
	OFFLINE_STATUS_EVENT,
	OfflineStatus,
	OUTBOX_CHANGED_EVENT,
	reportNetworkError,
	reportReachedServer,
} from "@/lib/offlineStatus";
import { checkServerReachable } from "@/services/api";
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
 *
 * NEW
 *   - While the banner is showing, it checks the server every 15s and
 *     hides itself as soon as the server answers. Before, it stayed on
 *     until some page happened to make a request that worked.
 *   - If the internet is ON but the server was too slow (over 8s), it now
 *     says "Slow connection to the server" instead of "You're offline".
 */

const RETRY_MS = 30000;
const RECHECK_MS = 15000;
const EMPTY_ROUTES: string[] = [];

type Props = {
	// Called when the phone comes back online, so pages reload live data.
	onBackOnline?: () => void;
	// Pages to save for offline use (opened once in the background while
	// online, so they still open with no internet).
	warmRoutes?: string[];
};

const formatSaved = (iso: string): string =>
	new Date(iso).toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});

export const OfflineBanner = ({
	onBackOnline,
	warmRoutes = EMPTY_ROUTES,
}: Props) => {
	const [status, setStatus] = useState<OfflineStatus>(getOfflineStatus());
	const [pending, setPending] = useState<OutboxItem[]>([]);
	const [failures, setFailures] = useState<SyncFailure[]>([]);
	const [showList, setShowList] = useState(false);

	// Keep the latest callback without re-running the effects below
	// every time the parent re-renders with a new inline function.
	const onBackOnlineRef = useRef(onBackOnline);
	useEffect(() => {
		onBackOnlineRef.current = onBackOnline;
	}, [onBackOnline]);

	// Same idea for warmRoutes: compare by content, not by array identity.
	const warmRoutesKey = warmRoutes.join("|");

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
		setStatus(getOfflineStatus()); // catch anything that changed before mount
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
			onBackOnlineRef.current?.();
		};
		window.addEventListener("offline", goOffline);
		window.addEventListener("online", goOnline);
		return () => {
			window.removeEventListener("offline", goOffline);
			window.removeEventListener("online", goOnline);
		};
	}, []);

	// Banner showing -> keep checking; hide it once the server answers.
	useEffect(() => {
		if (!status.offline) return;
		const t = setInterval(async () => {
			if (await checkServerReachable()) {
				reportReachedServer();
				flushOutbox();
				onBackOnlineRef.current?.();
			}
		}, RECHECK_MS);
		return () => clearInterval(t);
	}, [status.offline]);

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
		const routes = warmRoutesKey ? warmRoutesKey.split("|") : [];
		if (routes.length === 0 || !("serviceWorker" in navigator)) return;
		const KEY = "beeguard_offline_pages_saved";
		try {
			if (sessionStorage.getItem(KEY)) return;
		} catch {
			return;
		}

		const t = setTimeout(async () => {
			if (!navigator.onLine || !navigator.serviceWorker.controller)
				return;
			for (const route of routes) {
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
	}, [warmRoutesKey]);

	useEffect(() => {
		if (status.offline && status.showingSavedFrom) {
			console.log(
				`You're offline — showing data saved ${formatSaved(status.showingSavedFrom)}`,
			);
		}
	}, [status.offline, status.showingSavedFrom]);

	// Internet is on but the server was too slow, so saved data is shown.
	const slowNotOffline =
		status.offline &&
		!!status.showingSavedFrom &&
		typeof navigator !== "undefined" &&
		navigator.onLine;

	const count = pending.length;
	const plural = count === 1 ? "change" : "changes";

	if (
		!status.offline &&
		!status.syncing &&
		count === 0 &&
		failures.length === 0
	) {
		return null;
	}

	return (
		// One stack for all banners so they never overlap.
		// Mobile: bottom-20 keeps the bottom nav visible. Desktop: bottom-0.
		// pointer-events-none on the wrapper so it never blocks taps on the
		// page; each banner turns pointer-events back on.
		<div className="pointer-events-none fixed left-0 bottom-20 lg:bottom-0 z-9999 flex w-full flex-col items-end gap-2 p-3 text-xs lg:max-w-100 lg:w-1/4">
			{/* REFUSED BY THE SERVER */}
			{failures.length > 0 && (
				<div className="pointer-events-auto w-full rounded-lg border border-[#ff9b9b] bg-[#ffecec] p-2 text-[#a10000]">
					<div className="flex items-center gap-2">
						<Icon
							icon="octicon:alert-16"
							className="h-4 w-4 shrink-0"
						/>
						<span className="Poppins-SemiBold">
							{failures.length === 1
								? "1 offline change couldn't be saved"
								: `${failures.length} offline changes couldn't be saved`}
						</span>
						<button
							type="button"
							onClick={clearSyncFailures}
							className="ml-auto underline">
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

			{/* WAITING TO SYNC / SYNCING */}
			{(count > 0 || status.syncing) && (
				<div className="pointer-events-auto w-full rounded-lg border border-[#ffdb4f] bg-[#fff8e1] p-2 text-[#4a2f00]">
					<div className="flex items-center gap-2">
						<Icon
							icon={
								status.syncing
									? "line-md:loading-loop"
									: "mdi:cloud-upload-outline"
							}
							className="h-4 w-4 shrink-0"
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
								className="ml-auto underline">
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

			{/* OFFLINE */}
			{status.offline && (
				<div className="pointer-events-auto flex w-full items-center gap-2 rounded-lg border border-[#FAC775] bg-[#FAEEDA] p-2 text-[#854F0B]">
					<Icon
						icon="material-symbols:wifi-off-rounded"
						className="h-4 w-4 shrink-0"
					/>
					<span className="Poppins-SemiBold">
						{slowNotOffline
							? "Slow connection to the server."
							: "You're offline."}
					</span>
				</div>
			)}
		</div>
	);
};