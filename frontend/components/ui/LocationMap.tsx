"use client";

// Small, non-interactive map preview used inside a location chat bubble.
// Loaded with next/dynamic({ ssr: false }) from Chat.tsx, because
// Leaflet touches `window` and can't render on the server.

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";

type LocationMapProps = {
	latitude: number;
	longitude: number;
	live?: boolean;
};

// Keeps the map centred on the pin when a live location moves.
const Recenter = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
	const map = useMap();
	useEffect(() => {
		map.setView([latitude, longitude], map.getZoom(), { animate: true });
	}, [latitude, longitude, map]);
	return null;
};

const LocationMap = ({ latitude, longitude, live }: LocationMapProps) => {
	const color = live ? "#ffa004" : "#4a2f00";

	return (
		<MapContainer
			center={[latitude, longitude]}
			zoom={16}
			dragging={false}
			zoomControl={false}
			scrollWheelZoom={false}
			doubleClickZoom={false}
			touchZoom={false}
			boxZoom={false}
			keyboard={false}
			className="w-full h-full">
			<TileLayer
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				attribution="&copy; OpenStreetMap"
			/>
			{/* Accuracy halo + dot. CircleMarker avoids Leaflet's default
			    marker PNGs, which break under Next's bundler. */}
			<CircleMarker
				center={[latitude, longitude]}
				radius={16}
				pathOptions={{ stroke: false, fillColor: color, fillOpacity: 0.2 }}
			/>
			<CircleMarker
				center={[latitude, longitude]}
				radius={7}
				pathOptions={{ color: "#ffffff", weight: 3, fillColor: color, fillOpacity: 1 }}
			/>
			<Recenter latitude={latitude} longitude={longitude} />
		</MapContainer>
	);
};

export default LocationMap;