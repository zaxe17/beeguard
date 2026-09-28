// hooks/useAlertLocation.ts

"use client";

import { useEffect, useState } from "react";
import {
	cachedPlaceName,
	reverseGeocode as sharedReverseGeocode,
} from "@/services/geocode";
import { PLACE_LOADING, PLACE_UNKNOWN } from "@/hooks/usePlaceName";

// Deliberately narrower than AlertRecord/AlertDetail so this hook
// works for both — anything with lat/lng and an optional pre-known
// location string structurally satisfies this, no casting needed.
export interface LocatableAlert {
	latitude: number;
	longitude: number;
	affected_area?: string | null;
}

// Cache/lookup key for a lat/lng pair. Rounded to 5 decimals (~1m
// precision) so essentially-identical coordinates share one resolved
// address instead of firing a separate geocode request each.
export function alertLocationKey(a: LocatableAlert): string | null {
	const lat = Number(a.latitude);
	const lng = Number(a.longitude);
	if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
	return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

// Coordinates -> "Barangay, City" (e.g. "Moonwalk, Parañaque").
// Now goes through services/geocode.ts, which every page shares:
//   - one request per second (OpenStreetMap's limit) — the old version
//     fired every alert's lookup at the same time, most got blocked, and
//     the card fell back to showing latitude/longitude;
//   - picks the BARANGAY (quarter/village) first, not the subdivision;
//   - remembers names in the browser, so a pin is looked up only once;
//   - retries a failed lookup instead of remembering the failure.
// Returns null only if every try failed.
export async function reverseGeocode(
	lat: number,
	lng: number,
): Promise<string | null> {
	return sharedReverseGeocode(lat, lng);
}

// A saved affected_area is used as-is unless it's a city DISTRICT
// ("Parañaque District 2, ...") or the "Airport Village" subdivision an
// older version saved instead of the barangay — those are looked up again
// (run server/scripts/fill_alert_places.py to fix them for good).
const WRONG_AREA_RE = /\bdistrict\b|airport village/i;
const savedArea = (a: LocatableAlert): string | null =>
	a.affected_area && !WRONG_AREA_RE.test(a.affected_area) ? a.affected_area : null;

// `resolvedLocations` maps an alertLocationKey() to its "Barangay, City"
// (or PLACE_UNKNOWN when every lookup failed).
export function getAlertLocation(
	a: LocatableAlert,
	resolvedLocations: Record<string, string>,
): string {
	const saved = savedArea(a);
	if (saved) return saved;
	const key = alertLocationKey(a);
	if (!key) return PLACE_UNKNOWN;
	if (resolvedLocations[key]) return resolvedLocations[key];
	const cached = cachedPlaceName(Number(a.latitude), Number(a.longitude));
	return cached ?? PLACE_LOADING;
}

// Shared hook: pass in whatever alert list a page is currently
// showing, get back a lat/lng -> "Barangay, City" map. Any page that
// renders a list of alerts (Dashboard's Recent Alerts, the Alert
// lists, Alert Details, admin Alerts) uses this with getAlertLocation().
export function useAlertLocations(
	alerts: LocatableAlert[],
): Record<string, string> {
	const [resolvedLocations, setResolvedLocations] = useState<
		Record<string, string>
	>({});

	useEffect(() => {
		let cancelled = false;
		const seen = new Set<string>();

		alerts.forEach((a) => {
			if (savedArea(a)) return;
			const key = alertLocationKey(a);
			if (!key || seen.has(key) || resolvedLocations[key]) return;
			seen.add(key);

			const lat = Number(a.latitude);
			const lng = Number(a.longitude);
			sharedReverseGeocode(lat, lng).then((name) => {
				if (cancelled) return;
				setResolvedLocations((prev) =>
					prev[key] ? prev : { ...prev, [key]: name ?? PLACE_UNKNOWN },
				);
			});
		});

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [alerts]);

	return resolvedLocations;
}