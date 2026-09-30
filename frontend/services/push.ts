// services/push.ts
//
// Push notifications in the browser (routes/push.py on the backend).
// The service worker is next-pwa's public/sw.js; the push code in it
// comes from worker/index.js (merged in on `npm run build`).
//   enablePush()   — asks permission, subscribes this device, saves it
//   disablePush()  — unsubscribes this device
//   syncPush()     — permission already given: re-saves this device for
//                    whoever is logged in now (e.g. after switching account)
//   stopPushOnLogout() — NEW: logging out stops push on this device, so
//                    no more pop-ups / sounds for the account that left
//
// Works in Chrome / Edge / Firefox (computer + Android). On iPhone, BeeGuard
// must first be added to the Home Screen (iOS 16.4+). Needs HTTPS when
// deployed — http://localhost is fine for testing.

import { api } from "./api";

// Which service worker this build uses:
//   dev  -> /push-sw.js (push only; next-pwa is off in dev and the built
//           sw.js can't start under `next dev`)
//   prod -> /sw.js     (next-pwa: caching + push from worker/index.js)
export const SW_URL =
	process.env.NODE_ENV === "development" ? "/push-sw.js" : "/sw.js";

export const PUSH_MESSAGE_EVENT = "beeguard:push"; // sent by worker/index.js (inside the next-pwa sw.js)

export type PushState =
	| "unsupported" // this browser can't do push
	| "not-configured" // server has no VAPID keys yet
	| "blocked" // user said "Block" — must be changed in browser settings
	| "off" // allowed but this device isn't subscribed
	| "on"; // this device gets push notifications

export const pushSupported = () =>
	typeof window !== "undefined" &&
	"serviceWorker" in navigator &&
	"PushManager" in window &&
	"Notification" in window;

// Base64url public key -> the bytes pushManager.subscribe() wants.
const toKeyBytes = (base64url: string): Uint8Array<ArrayBuffer> => {
	const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	const raw = atob(padded);
	const bytes = new Uint8Array(new ArrayBuffer(raw.length));
	for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
	return bytes;
};

const READY_TIMEOUT_MS = 8000;

const pathOf = (worker: ServiceWorker | null | undefined) =>
	worker ? new URL(worker.scriptURL).pathname : "";

const isOurWorker = (reg: ServiceWorkerRegistration | undefined) =>
	!!reg?.active && pathOf(reg.active) === SW_URL;

// updateViaCache: "none" -> the browser never uses a cached copy of the
// worker script, so a fixed/rebuilt sw.js is picked up right away.
export const registerServiceWorker = () =>
	navigator.serviceWorker.register(SW_URL, {
		scope: "/",
		updateViaCache: "none",
	});

/** Resolves when `worker` is activated; rejects if it fails or times out. */
const waitUntilActive = (worker: ServiceWorker) =>
	new Promise<void>((resolve, reject) => {
		if (worker.state === "activated") return resolve();
		if (worker.state === "redundant") {
			return reject(new Error("The service worker failed to start."));
		}
		const timer = setTimeout(
			() =>
				reject(new Error("The service worker took too long to start.")),
			READY_TIMEOUT_MS,
		);
		worker.addEventListener("statechange", () => {
			if (worker.state === "activated") {
				clearTimeout(timer);
				resolve();
			} else if (worker.state === "redundant") {
				clearTimeout(timer);
				reject(new Error("The service worker failed to start."));
			}
		});
	});

/** One attempt: reuse the running worker, or register + wait for it. */
const tryGetWorker = async (): Promise<ServiceWorkerRegistration> => {
	// FAST path: already registered and running (next-pwa registers it on
	// page load) -> use it right away.
	const existing = await navigator.serviceWorker.getRegistration("/");
	if (existing && isOurWorker(existing)) return existing;

	// None yet, or a different build's worker -> register the right one.
	const reg = await registerServiceWorker();
	if (isOurWorker(reg)) return reg;

	const worker = reg.installing ?? reg.waiting ?? reg.active;
	if (!worker) throw new Error("No service worker found.");
	await waitUntilActive(worker);
	return reg;
};

/** Remove every registration on this origin (stale/broken workers). */
const resetWorkers = async () => {
	const regs = await navigator.serviceWorker.getRegistrations();
	await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
};

/**
 * The service worker to subscribe with. If the first attempt fails (a
 * stale worker from an old build/dev session is stuck), it removes ALL
 * registrations and tries once more from scratch — this is the
 * "unregister the old service worker" step done automatically.
 */
const getWorker = async (): Promise<ServiceWorkerRegistration> => {
	try {
		return await tryGetWorker();
	} catch {
		await resetWorkers();
		try {
			return await tryGetWorker();
		} catch (e) {
			const reason = e instanceof Error ? e.message : String(e);
			throw new Error(
				`${reason} Clear this site's data and reload. If it keeps happening, rebuild with "next build --webpack" so ${SW_URL} is regenerated.`,
			);
		}
	}
};

const subscribeWith = async (reg: ServiceWorkerRegistration, key: string) =>
	(await reg.pushManager.getSubscription()) ??
	(await reg.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: toKeyBytes(key),
	}));

let publicKeyCache: string | null | undefined;
const getPublicKey = async (): Promise<string | null> => {
	if (publicKeyCache !== undefined) return publicKeyCache;
	const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
	if (fromEnv) return (publicKeyCache = fromEnv);
	const res = await api.get<{ public_key: string | null; enabled: boolean }>(
		"/push/public-key",
	);
	// Don't cache a failed request — allow a retry on the next call.
	if (!res.success) return null;
	publicKeyCache = res.data?.enabled ? res.data.public_key : null;
	return publicKeyCache;
};

const saveSubscription = (sub: PushSubscription) =>
	api.post("/push/subscribe", { subscription: sub.toJSON() });

/**
 * Call when a page with the notification button opens: fetches the
 * server key and wakes the service worker up NOW, so tapping the button
 * later only has to ask permission and subscribe.
 */
export const warmUpPush = () => {
	if (!pushSupported()) return;
	getPublicKey().catch(() => undefined);
	navigator.serviceWorker.getRegistration("/").then((reg) => {
		if (!reg) registerServiceWorker().catch(() => undefined);
	});
};

/** Current state for this browser/device. */
export const getPushState = async (): Promise<PushState> => {
	if (!pushSupported()) return "unsupported";
	if (Notification.permission === "denied") return "blocked";
	if (!(await getPublicKey())) return "not-configured";
	if (Notification.permission !== "granted") return "off";
	const reg = await navigator.serviceWorker.getRegistration("/");
	const sub = reg ? await reg.pushManager.getSubscription() : null;
	return sub ? "on" : "off";
};

/** Ask permission (must be called from a tap/click) and turn push on. */
export const enablePush = async (): Promise<{
	ok: boolean;
	state: PushState;
	message?: string;
}> => {
	if (!pushSupported()) {
		return {
			ok: false,
			state: "unsupported",
			message:
				"This browser can't show notifications. On iPhone, add BeeGuard to your Home Screen first.",
		};
	}
	const key = await getPublicKey();
	if (!key) {
		return {
			ok: false,
			state: "not-configured",
			message: "Notifications aren't set up on the server yet.",
		};
	}

	const permission = await Notification.requestPermission();
	if (permission !== "granted") {
		return {
			ok: false,
			state: permission === "denied" ? "blocked" : "off",
			message:
				permission === "denied"
					? "Notifications are blocked. Allow them in your browser's site settings."
					: "Notifications weren't allowed.",
		};
	}

	try {
		const reg = await getWorker();
		const sub = await subscribeWith(reg, key);
		const res = await saveSubscription(sub);
		if (!res.success)
			return { ok: false, state: "off", message: res.message };
		return { ok: true, state: "on" };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return {
			ok: false,
			state: "off",
			message: `Couldn't turn on notifications: ${msg}`,
		};
	}
};

/** Turn push off for this device. */
export const disablePush = async (): Promise<void> => {
	if (!pushSupported()) return;
	const reg = await navigator.serviceWorker.getRegistration("/");
	const sub = reg ? await reg.pushManager.getSubscription() : null;
	if (!sub) return;
	await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
	await sub.unsubscribe().catch(() => undefined);
};

/**
 * NEW — called on logout (context/AuthContext.tsx). Unsubscribes this
 * browser first (instant, works offline — the server then gets "gone"
 * the next time it tries and forgets the device), then tells the server
 * to delete it right away. Runs after the login token is already
 * cleared, so /push/unsubscribe doesn't need a login. Never throws.
 * Permission stays granted, so logging in again turns push back on by
 * itself (syncPush).
 */
export const stopPushOnLogout = async (): Promise<void> => {
	if (!pushSupported()) return;
	try {
		const reg = await navigator.serviceWorker.getRegistration("/");
		const sub = reg ? await reg.pushManager.getSubscription() : null;
		if (!sub) return;
		const endpoint = sub.endpoint;
		await sub.unsubscribe().catch(() => undefined);
		await api.post("/push/unsubscribe", { endpoint });
	} catch {
		// Not fatal — the browser side is already unsubscribed.
	}
};

/**
 * Permission already given (e.g. a returning user): make sure this device
 * is subscribed and saved for whoever is logged in now. Never prompts.
 */
export const syncPush = async (): Promise<void> => {
	if (!pushSupported() || Notification.permission !== "granted") return;
	try {
		const key = await getPublicKey();
		if (!key) return;
		const reg = await getWorker();
		const sub = await subscribeWith(reg, key);
		await saveSubscription(sub);
	} catch {
		// Not fatal — in-app notifications still work.
	}
};

/** "Send a test notification" to all my devices. */
export const sendTestPush = () => api.post<{ sent: number }>("/push/test", {});