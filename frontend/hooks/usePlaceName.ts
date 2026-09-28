"use client";

import { useEffect, useState } from "react";
import { cachedPlaceName, reverseGeocode } from "@/services/geocode";

export const PLACE_LOADING = "Locating…";
export const PLACE_UNKNOWN = "Unknown location";

/**
 * Turns stored coordinates into "Barangay, City" for display
 * ("Moonwalk, Parañaque"). Shows "Locating…" while the lookup runs and
 * "Unknown location" if it keeps failing — never the raw coordinates.
 */
export const usePlaceName = (lat?: number | null, lng?: number | null) => {
	const hasCoords = lat != null && lng != null;
	const [name, setName] = useState<string | null>(() =>
		hasCoords ? cachedPlaceName(Number(lat), Number(lng)) : null,
	);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (!hasCoords) return;
		let cancelled = false;
		const cached = cachedPlaceName(Number(lat), Number(lng));
		setName(cached);
		setFailed(false);
		if (cached) return;
		reverseGeocode(Number(lat), Number(lng)).then((label) => {
			if (cancelled) return;
			setName(label);
			setFailed(!label);
		});
		return () => {
			cancelled = true;
		};
	}, [hasCoords, lat, lng]);

	if (!hasCoords) return "";
	if (name) return name;
	return failed ? PLACE_UNKNOWN : PLACE_LOADING;
};