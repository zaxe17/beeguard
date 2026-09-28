// services/geocode.ts
//
// Place name <-> coordinates, using OpenStreetMap data (same map data
// the Leaflet maps already use — no API key).
//
// Coordinates -> "Barangay, City" (e.g. "Moonwalk, Parañaque") now comes
// from OUR BACKEND (GET /api/places/reverse, utils/place_name.py), not
// straight from OpenStreetMap. The backend looks each spot up only once
// and shares the answer with every user, so the pages no longer go over
// OpenStreetMap's 1-request-per-second limit and get blocked (HTTP 429),
// which is what made "Locating…" take so long.
//
// Reports still store ONLY latitude/longitude — names are looked up for
// display.

import { api } from "./api";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const MIN_GAP_MS = 1100;

export type Place = { lat: number; lng: number; label: string };

type NominatimAddress = Record<string, string | undefined>;
type NominatimResult = {
	lat: string;
	lon: string;
	display_name: string;
	address?: NominatimAddress;
};

// ── 1 request / second queue (place SEARCH only) ──
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

const throttled = <T>(fn: () => Promise<T>): Promise<T> => {
	const run = queue.then(async () => {
		const wait = Math.max(0, lastCall + MIN_GAP_MS - Date.now());
		if (wait) await new Promise((r) => setTimeout(r, wait));
		lastCall = Date.now();
		return fn();
	});
	queue = run.catch(() => undefined);
	return run;
};

// "Parañaque District 2", "District IV" — a city DISTRICT, never the barangay.
const DISTRICT_RE = /\bdistrict\b/i;

// "Barangay, City" for the place SEARCH (report step 2). In Nominatim's
// Philippine data the BARANGAY is "quarter" (cities) or "village"
// (provinces); "neighbourhood" is a subdivision inside a barangay
// (e.g. "Airport Village" inside Moonwalk), so it's not used.
const shortLabel = (r: NominatimResult): string => {
	const a = r.address ?? {};
	const barangay = [a.quarter, a.village, a.suburb, a.hamlet].find(
		(c) => !!c && !DISTRICT_RE.test(c),
	);
	const city = a.city || a.town || a.municipality || a.county || a.state;
	const parts = [barangay, city].filter(Boolean) as string[];
	if (parts.length) return Array.from(new Set(parts)).join(", ");
	return r.display_name.split(",").slice(0, 2).join(",").trim();
};

export const formatCoords = (lat: number, lng: number) =>
	`${lat.toFixed(5)}, ${lng.toFixed(5)}`;

// "14.676040, 121.043700" typed directly — no lookup needed.
export const parseCoords = (text: string): { lat: number; lng: number } | null => {
	const m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
	if (!m) return null;
	const lat = parseFloat(m[1]);
	const lng = parseFloat(m[2]);
	if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
	return { lat, lng };
};

/** Place name -> best match (Philippines only). null if nothing found. */
export const searchPlace = (query: string): Promise<Place | null> =>
	throttled(async () => {
		const url =
			`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1` +
			`&countrycodes=ph&accept-language=en&q=${encodeURIComponent(query)}`;
		try {
			const res = await fetch(url, { headers: { Accept: "application/json" } });
			if (!res.ok) return null;
			const data = (await res.json()) as NominatimResult[];
			if (!data.length) return null;
			return {
				lat: parseFloat(data[0].lat),
				lng: parseFloat(data[0].lon),
				label: shortLabel(data[0]),
			};
		} catch {
			return null;
		}
	});

// ── Coordinates -> "Barangay, City" (from our backend) ──
// Names are also remembered in the browser so they show instantly on
// the next visit. Not-found ones aren't remembered (tried again later).
// v4: drops names saved by older versions ("… District 2", "Airport Village").
const STORAGE_KEY = "beeguard:place-names:v4";
const RETRY_DELAY_MS = 3000;

const reverseCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();
let storageLoaded = false;

const loadStoredNames = () => {
	if (storageLoaded) return;
	storageLoaded = true;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const saved = JSON.parse(raw) as Record<string, string>;
		Object.entries(saved).forEach(([k, v]) => {
			if (typeof v === "string" && v) reverseCache.set(k, v);
		});
	} catch {
		// Storage blocked / bad data — just ask the backend again.
	}
};

const saveStoredNames = () => {
	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(Object.fromEntries(reverseCache)),
		);
	} catch {
		// Storage full / blocked — the in-memory cache still works.
	}
};

const placeKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

/** Remembered "Barangay, City" for these coordinates, if any. */
export const cachedPlaceName = (lat: number, lng: number): string | null => {
	if (typeof window !== "undefined") loadStoredNames();
	return reverseCache.get(placeKey(lat, lng)) ?? null;
};

// One place request at a time, so a page with many cards doesn't tie up
// the browser's connections and slow down its other API calls.
let placeQueue: Promise<unknown> = Promise.resolve();
const oneAtATime = <T>(fn: () => Promise<T>): Promise<T> => {
	const run = placeQueue.then(fn);
	placeQueue = run.catch(() => undefined);
	return run;
};

const askBackend = (lat: number, lng: number): Promise<string | null> =>
	oneAtATime(async () => {
		const res = await api.get<{ name: string | null }>(
			`/places/reverse?lat=${lat}&lng=${lng}`,
		);
		return res.success ? (res.data?.name ?? null) : null;
	});

/**
 * Coordinates -> "Barangay, City". null if the backend couldn't find
 * the barangay right now (tried once more after a few seconds).
 * The same pin asked for by many cards at once is requested only once.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
	lat = Number(lat);
	lng = Number(lng);
	if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

	const cached = cachedPlaceName(lat, lng);
	if (cached) return cached;

	const key = placeKey(lat, lng);
	const pending = inFlight.get(key);
	if (pending) return pending;

	const job = (async () => {
		for (let attempt = 0; attempt < 2; attempt++) {
			if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
			const name = await askBackend(lat, lng);
			if (name) {
				reverseCache.set(key, name);
				saveStoredNames();
				return name;
			}
		}
		return null;
	})();

	inFlight.set(key, job);
	try {
		return await job;
	} finally {
		inFlight.delete(key);
	}
};