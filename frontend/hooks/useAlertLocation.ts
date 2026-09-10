// hooks/useAlertLocation.ts

"use client";

import { useEffect, useRef, useState } from "react";

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

// Reverse-geocodes a lat/lng pair into "Barangay, City" using
// OpenStreetMap's free Nominatim API (no API key required). Used only
// as a fallback for alerts that don't already have an affected_area
// on file.
//
// Field mapping verified against a real Parañaque address: the
// barangay ("Moonwalk") came back under "quarter", "neighbourhood"
// held a private subdivision INSIDE that barangay ("Airport Village"),
// and "city_district" held the city's larger district ("Parañaque
// District 2") — a bigger unit than a barangay, not the barangay
// itself. So city_district/borough are deliberately excluded; quarter
// is tried first, with suburb/village/neighbourhood only as fallbacks
// for areas tagged differently.
//
// Returns null on any failure so the caller can fall back to showing
// the raw coordinates instead of getting stuck.
export async function reverseGeocode(
	lat: number,
	lng: number,
): Promise<string | null> {
	try {
		const res = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
		);
		if (!res.ok) return null;
		const data = await res.json();
		const address = data?.address;
		if (!address) return data?.display_name ?? null;

		const barangay =
			address.quarter ||
			address.suburb ||
			address.village ||
			address.neighbourhood ||
			null;

		const city =
			address.city ||
			address.town ||
			address.municipality ||
			address.state ||
			null;

		const parts = [barangay, city].filter(Boolean);
		if (parts.length > 0) return parts.join(", ");

		// Neither field came back — fall back to the full address
		// string rather than showing nothing.
		return data?.display_name ?? null;
	} catch {
		return null;
	}
}

// `resolvedLocations` maps an alertLocationKey() to its resolved
// exact-location string (either the geocoded "Barangay, City", or the
// raw "lat, lng" text if geocoding failed — either way, once a key is
// in here it won't be retried).
export function getAlertLocation(
	a: LocatableAlert,
	resolvedLocations: Record<string, string>,
): string {
	if (a.affected_area) return a.affected_area;
	const key = alertLocationKey(a);
	if (key && resolvedLocations[key]) return resolvedLocations[key];
	if (!key) return "Unknown location";
	return "Locating…";
}

// Shared hook: pass in whatever alert list a page is currently
// showing, get back a lat/lng -> "Barangay, City" cache. Any page that
// renders a list of AlertRecord (Dashboard's Recent Alerts, the full
// Alert list, Alert > Today) can drop this in and use getAlertLocation()
// instead of keeping its own copy of the reverse-geocoding logic.
export function useAlertLocations(
	alerts: LocatableAlert[],
): Record<string, string> {
	const [resolvedLocations, setResolvedLocations] = useState<
		Record<string, string>
	>({});
	// Tracks keys currently being resolved so a re-render (or a second
	// alert sharing the same coordinates, possibly on a different page)
	// doesn't fire a duplicate geocode request while one is in flight.
	const resolvingKeysRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		alerts.forEach((a) => {
			if (a.affected_area) return;
			const key = alertLocationKey(a);
			if (!key) return;
			if (resolvedLocations[key] || resolvingKeysRef.current.has(key)) return;

			resolvingKeysRef.current.add(key);
			const lat = Number(a.latitude);
			const lng = Number(a.longitude);
			reverseGeocode(lat, lng).then((address) => {
				resolvingKeysRef.current.delete(key);
				setResolvedLocations((prev) => ({
					...prev,
					// Fall back to the raw coordinates on geocode failure so
					// we don't keep retrying a bad/rate-limited request.
					[key]: address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
				}));
			});
		});
	}, [alerts, resolvedLocations]);

	return resolvedLocations;
}