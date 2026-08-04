// components/ui/google-maps/Map.tsx

"use client";

import { useMemo, useState } from "react";
import {
	MapContainer,
	TileLayer,
	Marker,
	Circle,
	useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

type MapProps = {
	onLocationSelect?: (coords: LatLng) => void;
	initialCenter?: LatLng;
	initialMarker?: LatLng | null;
	// NEW: when provided, draws a circle around the marker showing the
	// current danger radius (in kilometers) — updates live as the
	// value changes, e.g. from the Add Alert modal's radius slider.
	radiusKm?: number | null;
};

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

const Map = ({
	onLocationSelect,
	initialCenter,
	initialMarker,
	radiusKm,
}: MapProps) => {
	const [marker, setMarker] = useState<LatLng | null>(initialMarker ?? null);
	const center = marker ?? initialCenter ?? DEFAULT_CENTER;

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
					background: #ff9a00;
					border: 3px solid #fff;
					border-radius: 50% 50% 50% 0;
					transform: rotate(-45deg);
					box-shadow: 0 2px 6px rgba(0,0,0,0.4);
				"></div>`,
				iconSize: [26, 26],
				iconAnchor: [13, 26],
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
			style={{ width: "100%", height: "100%" }}>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{marker && <Marker position={[marker.lat, marker.lng]} icon={pinIcon} />}
			{marker && radiusKm != null && radiusKm > 0 && (
				<Circle
					center={[marker.lat, marker.lng]}
					radius={radiusKm * 1000}
					pathOptions={{
						color: "#ff9a00",
						fillColor: "#ff9a00",
						fillOpacity: 0.15,
						weight: 2,
					}}
				/>
			)}
			<ClickHandler onClick={handleClick} />
		</MapContainer>
	);
};

export default Map;