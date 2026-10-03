// utils/geo.ts
const LOCATION_TIMEOUT_MS = 5000;

export const getCitizenCoords = () =>
	new Promise<{ lat: number; lng: number } | null>((resolve) => {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			resolve(null);
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) =>
				resolve({
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
				}),
			() => resolve(null),
			{
				enableHighAccuracy: false,
				timeout: LOCATION_TIMEOUT_MS,
				maximumAge: 5 * 60 * 1000,
			},
		);
	});
