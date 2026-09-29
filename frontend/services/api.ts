// services/api.ts
// Central fetch wrapper. Handles base URL, JSON headers, Authorization,
// and normalizes the backend's { success, message, data|errors } envelope.
//
// OFFLINE MODE (NEW)
//   GET  — every successful answer is saved on the phone (per user). If
//          the server can't be reached (or takes longer than 8s and a saved
//          copy exists), the saved copy is returned instead, marked
//          { offline: true, saved_at }.
//   postOrQueue / patchOrQueue — used for hive & harvest changes. With no
//          internet the change is saved in an outbox and sent later
//          (lib/offlineSync.ts); the call returns { queued: true }.
//   Everything else (post / patch / delete / postForm) stays online-only.
//
// "YOU'RE OFFLINE" FIX
//   A request that fails is no longer enough to say "offline". One failed
//   request (a CORS problem, a Railway 502/timeout, a crashed route) used
//   to turn the banner on even though the internet and the server were
//   fine. Now a failure is double-checked with a tiny ping to the server
//   (checkServerReachable). Only if the ping ALSO fails is it "offline".
//   If the server answers the ping, the failed request is logged in the
//   browser console as "[BeeGuard] … failed but the server is reachable"
//   so you can see which endpoint has the problem.

import { outbox, responseCache } from "@/lib/offlineDb";
import {
	OUTBOX_CHANGED_EVENT,
	reportNetworkError,
	reportReachedServer,
	reportServedFromCache,
} from "@/lib/offlineStatus";

export type ApiEnvelope<T = unknown> = {
	success: boolean;
	message: string;
	data?: T;
	errors?: string[];
	// OFFLINE MODE
	offline?: boolean; // this is a saved copy, not live data
	saved_at?: string; // when that copy was saved (ISO)
	queued?: boolean; // change saved on the phone, will be sent later
	// The request never got an answer (offline, CORS, server down/timeout)
	// — not a real "no" from the server.
	network_error?: boolean;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "beeguard_token";

// A GET slower than this shows the saved copy (when there is one).
const GET_TIMEOUT_MS = 8000;

export const OFFLINE_SAVED_MESSAGE =
	"No internet — saved on this phone. It will be sent automatically when you're back online.";
const OFFLINE_NO_COPY_MESSAGE =
	"You're offline and this hasn't been saved on this device yet. Open it once while online.";
const NETWORK_ERROR_MESSAGE = "Network error. Is the backend running?";
const SERVER_ERROR_MESSAGE =
	"The server couldn't finish this request. Please try again.";

// Any small public endpoint works as the ping (no login needed).
const PING_PATH = "/push/public-key";
const PING_TIMEOUT_MS = 6000;
const PING_REUSE_MS = 5000; // reuse a ping result for this long

// REMEMBER ME — where the login token lives decides how long you stay
// signed in on this browser:
//   - "Remember me" ticked   -> localStorage: survives closing the browser
//     (the backend also gives this token a longer expiry).
//   - "Remember me" unticked -> sessionStorage: gone when the tab/browser
//     is closed, so you have to sign in again next time.
// get() checks both, so the rest of the app doesn't need to know which.
// Reads the login token's payload (no signature check — the backend
// does that). null if it isn't a readable token.
const readTokenPayload = (
	token: string,
): { sub?: string; role?: string; exp?: number; rmb?: boolean } | null => {
	try {
		const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
		return JSON.parse(atob(padded));
	} catch {
		return null;
	}
};

// A saved token that must NOT keep anyone signed in:
//   - already expired, or
//   - in localStorage (kept after closing the browser) but issued WITHOUT
//     "Remember me" — left over from before Remember me worked, when every
//     login was kept. This is what let /citizen open "without a password".
const isStaleToken = (token: string, inLocalStorage: boolean) => {
	const p = readTokenPayload(token);
	if (!p) return true;
	if (typeof p.exp === "number" && p.exp * 1000 <= Date.now()) return true;
	if (inLocalStorage && p.rmb !== true) return true;
	return false;
};

export const tokenStore = {
	get: (): string | null => {
		if (typeof window === "undefined") return null;
		try {
			const local = window.localStorage.getItem(TOKEN_KEY);
			if (local) {
				if (!isStaleToken(local, true)) return local;
				window.localStorage.removeItem(TOKEN_KEY);
			}
			const session = window.sessionStorage.getItem(TOKEN_KEY);
			if (session) {
				if (!isStaleToken(session, false)) return session;
				window.sessionStorage.removeItem(TOKEN_KEY);
			}
		} catch {
			/* storage blocked */
		}
		return null;
	},
	set: (token: string, remember = true) => {
		if (typeof window === "undefined") return;
		// Clear both first so an old token in the other store can't linger.
		window.localStorage.removeItem(TOKEN_KEY);
		window.sessionStorage.removeItem(TOKEN_KEY);
		if (remember) window.localStorage.setItem(TOKEN_KEY, token);
		else window.sessionStorage.setItem(TOKEN_KEY, token);
	},
	clear: () => {
		if (typeof window === "undefined") return;
		window.localStorage.removeItem(TOKEN_KEY);
		window.sessionStorage.removeItem(TOKEN_KEY);
	},
};

// "beekeeper:B-0001" for the signed-in user (read from the login token),
// "anon" when signed out. Saved data is stored under this key so one
// user's data is never shown to another user on the same phone.
export const currentUserKey = (): string => {
	const token = tokenStore.get();
	if (!token) return "anon";
	const p = readTokenPayload(token);
	return p ? `${p.role ?? "user"}:${p.sub ?? "?"}` : "anon";
};

const isOfflineNow = () =>
	typeof navigator !== "undefined" && navigator.onLine === false;

// ── Is the server reachable at all? ──
let pingInFlight: Promise<boolean> | null = null;
let lastPing = { at: 0, ok: false };

export const checkServerReachable = (): Promise<boolean> => {
	if (typeof window === "undefined") return Promise.resolve(true);
	if (isOfflineNow()) return Promise.resolve(false);
	if (Date.now() - lastPing.at < PING_REUSE_MS) return Promise.resolve(lastPing.ok);
	if (pingInFlight) return pingInFlight;

	pingInFlight = (async () => {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
		try {
			// Any answer at all (even an error status) means we reached it.
			await fetch(`${BASE_URL}/api${PING_PATH}`, {
				method: "GET",
				headers: { Accept: "application/json" },
				signal: ctrl.signal,
				cache: "no-store",
			});
			return true;
		} catch {
			return false;
		} finally {
			clearTimeout(timer);
		}
	})().then((ok) => {
		lastPing = { at: Date.now(), ok };
		pingInFlight = null;
		return ok;
	});
	return pingInFlight;
};

/**
 * A request didn't get an answer. Returns true if we're really offline
 * (and turns the banner on); false if the server is fine and only this
 * request failed (logged in the console instead).
 */
const confirmOffline = async (
	method: string,
	path: string,
	error: unknown,
): Promise<boolean> => {
	const reachable = await checkServerReachable();
	if (reachable) {
		reportReachedServer();
		console.warn(
			`[BeeGuard] ${method} ${path} failed but the server is reachable ` +
				"(CORS, a server error/timeout, or the request was blocked):",
			error,
		);
		return false;
	}
	reportNetworkError();
	return true;
};

// ── LOGIN EXPIRED / MISSING ──
// The backend refused the saved login token (expired, invalid, or none was
// found in this tab). Instead of every button failing with "Failed to
// create alert" etc., the token is cleared and the person is sent to the
// login page (app/page.tsx is "/") with ?expired=1.
// Only for requests that SENT a token, and never for /auth/* (a wrong
// password on the login page is also a 401 and must stay on the page).
const LOGIN_PROBLEM_MESSAGES = [
	"Token has expired.",
	"Invalid token.",
	"Missing or invalid Authorization header.",
];
let redirectingToLogin = false;

const handleLoginExpired = () => {
	if (typeof window === "undefined" || redirectingToLogin) return;
	redirectingToLogin = true;
	tokenStore.clear();
	// Already on the login page -> nothing to redirect.
	if (window.location.pathname === "/") {
		redirectingToLogin = false;
		return;
	}
	window.location.href = "/?expired=1";
};

// ── one HTTP call ──
export type SendResult<T> =
	| { reached: true; status: number; body: ApiEnvelope<T> }
	| { reached: false; error: unknown };

async function send<T>(
	path: string,
	init: RequestInit,
	opts: { json?: boolean; withAuth?: boolean } = {},
): Promise<SendResult<T>> {
	const { json = true, withAuth = true } = opts;
	const headers: Record<string, string> = {
		Accept: "application/json",
		...((init.headers as Record<string, string>) || {}),
	};
	// Multipart uploads must NOT set Content-Type — the browser adds it
	// with the right boundary string.
	if (json) headers["Content-Type"] = "application/json";

	const token = withAuth ? tokenStore.get() : null;
	if (token) headers["Authorization"] = `Bearer ${token}`;

	let res: Response;
	try {
		res = await fetch(`${BASE_URL}/api${path}`, { ...init, headers });
	} catch (error) {
		return { reached: false, error };
	}

	let body: ApiEnvelope<T>;
	try {
		body = (await res.json()) as ApiEnvelope<T>;
	} catch {
		body = {
			success: false,
			message: `Unexpected server response (${res.status}).`,
			errors: [],
		};
	}
	if (
		token &&
		!path.startsWith("/auth") &&
		(res.status === 401 || res.status === 403) &&
		LOGIN_PROBLEM_MESSAGES.includes(body.message)
	) {
		handleLoginExpired();
	}
	return { reached: true, status: res.status, body };
}

const networkErrorEnvelope = <T>(error: unknown, offline = true): ApiEnvelope<T> => ({
	success: false,
	message: !offline
		? SERVER_ERROR_MESSAGE
		: isOfflineNow()
			? OFFLINE_NO_COPY_MESSAGE
			: NETWORK_ERROR_MESSAGE,
	errors: [String(error ?? "offline")],
	offline: (offline && isOfflineNow()) || undefined,
	network_error: true,
});

// Plain online-only request (POST / PATCH / DELETE).
async function request<T>(
	path: string,
	init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
	const r = await send<T>(path, init);
	if (!r.reached) {
		const offline = await confirmOffline(init.method ?? "GET", path, r.error);
		return networkErrorEnvelope<T>(r.error, offline);
	}
	reportReachedServer();
	return r.body;
}

// ── GET with the offline copy ──
async function getWithCache<T>(path: string): Promise<ApiEnvelope<T>> {
	const userKey = currentUserKey();
	const canCache = userKey !== "anon";
	const cachedPromise = canCache
		? responseCache.get(userKey, path)
		: Promise.resolve(null);

	const fromCache = (cached: { body: unknown; savedAt: string }) => {
		reportServedFromCache(cached.savedAt);
		return {
			...(cached.body as ApiEnvelope<T>),
			offline: true,
			saved_at: cached.savedAt,
		};
	};

	// Phone says there's no connection -> don't even try.
	if (isOfflineNow()) {
		const cached = await cachedPromise;
		if (cached) return fromCache(cached);
		reportNetworkError();
		return networkErrorEnvelope<T>("offline");
	}

	let answeredFromCache = false;
	const networkPromise = send<T>(path, { method: "GET" }).then((r) => {
		if (r.reached) {
			// A late answer (after the saved copy was already shown) only
			// refreshes the saved copy — the banner keeps saying "saved data"
			// until the page loads again.
			if (!answeredFromCache) reportReachedServer();
			if (canCache && r.body.success) {
				responseCache.put(userKey, path, r.body);
			}
		}
		return r;
	});

	const cached = await cachedPromise;

	if (!cached) {
		const r = await networkPromise;
		if (!r.reached) {
			const offline = await confirmOffline("GET", path, r.error);
			return networkErrorEnvelope<T>(r.error, offline);
		}
		return r.body;
	}

	// There IS a saved copy: use it if the server is unreachable or slow.
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<"timeout">((resolve) => {
		timer = setTimeout(() => resolve("timeout"), GET_TIMEOUT_MS);
	});
	const first = await Promise.race([networkPromise, timeout]);
	clearTimeout(timer);

	if (first === "timeout") {
		// Server is too slow -> show the saved copy (banner says so).
		answeredFromCache = true;
		return fromCache(cached);
	}
	if (!first.reached) {
		answeredFromCache = true;
		const offline = await confirmOffline("GET", path, first.error);
		if (offline) return fromCache(cached);
		// Server is up, only this request failed -> still show the saved
		// copy so the page isn't empty, but DON'T say "offline".
		return {
			...(cached.body as ApiEnvelope<T>),
			offline: true,
			saved_at: cached.savedAt,
		};
	}
	return first.body;
}

// ── change that can wait for the internet ──
export interface QueueOptions {
	// Shown in the "waiting to sync" list, e.g. `Add harvest (12 kg)`.
	label: string;
	// If this body field is empty, fill it with TODAY (the phone's date)
	// when the change is queued — otherwise a harvest recorded offline on
	// Monday would be dated Tuesday when it syncs.
	stampDateField?: string;
}

const localToday = () => {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${mm}-${dd}`;
};

async function writeOrQueue<T>(
	method: "POST" | "PATCH",
	path: string,
	body: unknown,
	q: QueueOptions,
): Promise<ApiEnvelope<T>> {
	if (!isOfflineNow()) {
		const r = await send<T>(path, { method, body: JSON.stringify(body) });
		if (r.reached) {
			reportReachedServer();
			return r.body;
		}
		// The internet is fine and the server is up -> this is a server
		// problem, not "offline". Don't save it for later (it may even
		// have been saved already); let the person try again.
		const offline = await confirmOffline(method, path, r.error);
		if (!offline) return networkErrorEnvelope<T>(r.error, false);
	}

	// Offline -> save it in the outbox.
	const userKey = currentUserKey();
	if (userKey === "anon") {
		reportNetworkError();
		return networkErrorEnvelope<T>("offline");
	}

	let queuedBody = body;
	if (
		q.stampDateField &&
		body &&
		typeof body === "object" &&
		!(body as Record<string, unknown>)[q.stampDateField]
	) {
		queuedBody = { ...(body as object), [q.stampDateField]: localToday() };
	}

	// Pressing Save twice offline shouldn't send it twice later.
	const waiting = await outbox.list(userKey);
	const duplicate = waiting.some(
		(i) =>
			i.method === method &&
			i.path === path &&
			JSON.stringify(i.body) === JSON.stringify(queuedBody),
	);
	if (!duplicate) {
		const id = await outbox.add({
			userKey,
			method,
			path,
			body: queuedBody,
			label: q.label,
			createdAt: new Date().toISOString(),
		});
		if (id === null) {
			reportNetworkError();
			return {
				success: false,
				message:
					"No internet, and this device can't save changes offline. Please try again later.",
				errors: [],
			};
		}
	}

	reportNetworkError();
	if (typeof window !== "undefined") {
		window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
	}
	return {
		success: false,
		queued: true,
		message: OFFLINE_SAVED_MESSAGE,
		errors: [],
	};
}

// Used by lib/offlineSync.ts to send one saved change.
export const sendQueued = <T>(method: "POST" | "PATCH", path: string, body: unknown) =>
	send<T>(path, { method, body: JSON.stringify(body) });

// Multipart form upload (file uploads). Online-only.
//
// `withAuth: false` sends NO Authorization header even if a token is
// saved — used by the guest bee identification page (/guest), which must
// work the same whether or not someone is logged in on this browser.
async function requestForm<T>(
	path: string,
	form: FormData,
	withAuth = true,
): Promise<ApiEnvelope<T>> {
	const r = await send<T>(
		path,
		{ method: "POST", body: form },
		{ json: false, withAuth },
	);
	if (!r.reached) {
		const offline = await confirmOffline("POST", path, r.error);
		return networkErrorEnvelope<T>(r.error, offline);
	}
	reportReachedServer();
	return r.body;
}

export const api = {
	get: <T>(path: string) => getWithCache<T>(path),
	post: <T>(path: string, body: unknown) =>
		request<T>(path, { method: "POST", body: JSON.stringify(body) }),
	patch: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "PATCH",
			body: body !== undefined ? JSON.stringify(body) : undefined,
		}),
	// ChatModal's "Delete message" needed this.
	delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
	postForm: <T>(path: string, form: FormData) => requestForm<T>(path, form),
	// Same as postForm but never attaches the login token (guest use).
	postFormGuest: <T>(path: string, form: FormData) =>
		requestForm<T>(path, form, false),
	// OFFLINE MODE — sent now, or saved and sent when back online.
	postOrQueue: <T>(path: string, body: unknown, q: QueueOptions) =>
		writeOrQueue<T>("POST", path, body, q),
	patchOrQueue: <T>(path: string, body: unknown, q: QueueOptions) =>
		writeOrQueue<T>("PATCH", path, body, q),
};