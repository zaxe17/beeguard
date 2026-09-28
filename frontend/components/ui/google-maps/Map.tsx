// components/ui/google-maps/Map.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
	MapContainer,
	TileLayer,
	Marker,
	Circle,
	AttributionControl,
	useMap,
	useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

// NEW — one read-only pin for browsing multiple locations (Bee Farm
// listing). Distinct from the single click-to-place `marker` state
// below, which existing callers (registration, Add Alert) still use.
export type FarmMarker = {
	id: string;
	lat: number;
	lng: number;
	label?: string;
};

type MapProps = {
	onLocationSelect?: (coords: LatLng) => void;
	initialCenter?: LatLng;
	initialMarker?: LatLng | null;
	// NEW: when provided, draws a circle around the marker showing the
	// current danger radius (in kilometers) — updates live as the
	// value changes, e.g. from the Add Alert modal's radius slider.
	radiusKm?: number | null;

	// NEW — Bee Farm browsing mode. When `markers` is provided (even
	// as an empty array), the map switches from "click to place one
	// pin" to "show these read-only pins" — the click-to-place marker
	// and ClickHandler are disabled entirely in this mode, so this is
	// safe to add without touching registration/Add Alert, which never
	// pass this prop.
	markers?: FarmMarker[];
	selectedMarkerId?: string | null;
	onMarkerClick?: (id: string) => void;

	// NEW — parent-controlled pin (Report step 2: typing a location
	// moves the pin). When this changes, the pin moves and the map
	// flies to it. Clicking the map still calls onLocationSelect.
	markerPosition?: LatLng | null;
	// NEW — disables click-to-place (e.g. location came from the
	// device GPS and shouldn't be changed by a stray click).
	readOnly?: boolean;
	// NEW — color of the pin and its radius circle (e.g. an alert's risk
	// level: red / orange / green). Defaults to the usual orange.
	pinColor?: string;
};

const DEFAULT_PIN_COLOR = "#ff9a00";

// Same spot the old static iframe pointed at (Bureau of Animal
// Industry, QC) — used only as the default center before a pin is set.
const DEFAULT_CENTER: LatLng = { lat: 14.6598, lng: 121.0286 };

// react-leaflet only exposes click events via a child hook, not a
// prop on <MapContainer> — this renders nothing, just wires the event.
const ClickHandler = ({ onClick }: { onClick: (coords: LatLng) => void }) => {
	useMapEvents({
		click(e) {
			onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
		},
	});
	return null;
};

// Re-centers the map when the selected farm changes (e.g. clicking a
// card in BeefarmPage's sidebar) — <MapContainer center> only applies
// once, at mount, so selecting a different farm afterwards needs an
// explicit flyTo via the map instance.
const RecenterOnSelect = ({ target }: { target: LatLng | null }) => {
	const map = useMap();
	useEffect(() => {
		if (target) map.flyTo([target.lat, target.lng], map.getZoom());
	}, [target, map]);
	return null;
};

// NEW — Leaflet only measures its box once, so when the parent
// resizes the map (e.g. Bee Farm's map shrinking when a farm is opened)
// it would leave grey, untiled areas. This re-measures on every resize.
const InvalidateOnResize = () => {
	const map = useMap();
	useEffect(() => {
		const el = map.getContainer();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => map.invalidateSize());
		observer.observe(el);
		return () => observer.disconnect();
	}, [map]);
	return null;
};

// NEW — Bee Farm browsing: while no farm is selected, frame ALL farm
// pins (e.g. both of your farms) instead of a fixed default spot. Runs
// on first load, whenever the list changes (search), and again when a
// selection is cleared ("Show full map"). The short delay lets the
// map finish growing back to full size before it's framed.
const FitToMarkers = ({
	markers,
	active,
}: {
	markers: FarmMarker[];
	active: boolean;
}) => {
	const map = useMap();
	const key = markers.map((m) => `${m.id}:${m.lat},${m.lng}`).join("|");

	useEffect(() => {
		if (!active || markers.length === 0) return;
		const t = setTimeout(() => {
			map.invalidateSize();
			if (markers.length === 1) {
				map.flyTo([markers[0].lat, markers[0].lng], 15);
				return;
			}
			const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
			map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15 });
		}, 350);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, active, map]);

	return null;
};

// Flies to the parent-controlled pin whenever it changes.
const FollowMarker = ({ target }: { target: LatLng | null }) => {
	const map = useMap();
	useEffect(() => {
		if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15));
	}, [target?.lat, target?.lng, map]); // eslint-disable-line react-hooks/exhaustive-deps
	return null;
};

const Map = ({
	onLocationSelect,
	initialCenter,
	initialMarker,
	radiusKm,
	markers,
	selectedMarkerId,
	onMarkerClick,
	markerPosition,
	readOnly = false,
	pinColor = DEFAULT_PIN_COLOR,
}: MapProps) => {
	const farmMode = markers !== undefined;
	const controlled = markerPosition !== undefined;

	const [marker, setMarker] = useState<LatLng | null>(
		(controlled ? markerPosition : initialMarker) ?? null,
	);

	// Keep the pin in sync with the parent in controlled mode.
	useEffect(() => {
		if (controlled) setMarker(markerPosition ?? null);
	}, [controlled, markerPosition?.lat, markerPosition?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
	const selectedFarm = farmMode
		? (markers.find((m) => m.id === selectedMarkerId) ?? null)
		: null;
	const center =
		(farmMode ? selectedFarm : marker) ??
		initialCenter ??
		(farmMode && markers.length > 0
			? { lat: markers[0].lat, lng: markers[0].lng }
			: DEFAULT_CENTER);

	// Built lazily inside the component (not at module scope) so it
	// never runs during SSR/module evaluation — sidesteps Leaflet's
	// known webpack/Next.js issue where its default marker image
	// paths 404, and avoids "window is not defined" on the server.
	const pinIcon = useMemo(
		() =>
			L.divIcon({
				className: "",
				html: `<div style="
					width: 26px; height: 26px;
					background: ${pinColor};
					border: 3px solid #fff;
					border-radius: 50% 50% 50% 0;
					transform: rotate(-45deg);
					box-shadow: 0 2px 6px rgba(0,0,0,0.4);
				"></div>`,
				iconSize: [26, 26],
				iconAnchor: [13, 26],
			}),
		[pinColor],
	);

	// Farm pins get their own (slightly smaller, honey-yellow) icon so
	// they read as "browse a location" rather than "this is set as
	// your location" — and a bigger green variant for whichever farm
	// is currently selected in the sidebar.
	const farmIcon = useMemo(
		() =>
			L.divIcon({
				className: "",
				html: `<div style="
					width: 22px; height: 22px;
					background: #ffdb4f;
					border: 3px solid #fff;
					border-radius: 50% 50% 50% 0;
					transform: rotate(-45deg);
					box-shadow: 0 2px 6px rgba(0,0,0,0.35);
				"></div>`,
				iconSize: [22, 22],
				iconAnchor: [11, 22],
			}),
		[],
	);
	const farmIconSelected = useMemo(
		() =>
			L.divIcon({
				className: "",
				html: `<div style="
					width: 30px; height: 30px;
					background: #8ac44f;
					border: 3px solid #fff;
					border-radius: 50% 50% 50% 0;
					transform: rotate(-45deg);
					box-shadow: 0 3px 8px rgba(0,0,0,0.4);
				"></div>`,
				iconSize: [30, 30],
				iconAnchor: [15, 30],
			}),
		[],
	);

	const handleClick = (coords: LatLng) => {
		setMarker(coords);
		onLocationSelect?.(coords);
	};

	return (
		<MapContainer
			center={[center.lat, center.lng]}
			zoom={14}
			scrollWheelZoom
			style={{ width: "100%", height: "100%" }}
			// Disable the default attribution control (which shows a
			// "Leaflet | © OpenStreetMap contributors" link) so we can
			// add our own below with the "Leaflet" branding turned off —
			// the OpenStreetMap credit itself stays, since that one's
			// required by their tile usage terms.
			attributionControl={false}>
			<AttributionControl position="bottomright" prefix={false} />
			<InvalidateOnResize />
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>

			{!farmMode && marker && (
				<Marker position={[marker.lat, marker.lng]} icon={pinIcon} />
			)}
			{!farmMode && marker && radiusKm != null && radiusKm > 0 && (
				<Circle
					center={[marker.lat, marker.lng]}
					radius={radiusKm * 1000}
					pathOptions={{
						color: pinColor,
						fillColor: pinColor,
						fillOpacity: 0.15,
						weight: 2,
					}}
				/>
			)}
			{!farmMode && !readOnly && <ClickHandler onClick={handleClick} />}
			{!farmMode && controlled && <FollowMarker target={markerPosition ?? null} />}

			{farmMode &&
				markers.map((m) => (
					<Marker
						key={m.id}
						position={[m.lat, m.lng]}
						icon={m.id === selectedMarkerId ? farmIconSelected : farmIcon}
						eventHandlers={{
							click: () => onMarkerClick?.(m.id),
						}}
					/>
				))}
			{farmMode && <RecenterOnSelect target={selectedFarm} />}
			{farmMode && <FitToMarkers markers={markers} active={!selectedFarm} />}
		</MapContainer>
	);
};

export default Map;