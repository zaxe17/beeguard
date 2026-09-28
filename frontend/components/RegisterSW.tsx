"use client";

import { useEffect } from "react";
import { SW_URL, registerServiceWorker } from "@/services/push";

// Registers the service worker on every page:
//   npm run dev   -> /push-sw.js (push notifications only, no caching)
//   npm run build -> /sw.js      (next-pwa: offline caching + push)
// The built sw.js can't start under `next dev` (it pre-caches files from
// the last build that the dev server doesn't have), which is why dev uses
// its own small worker — see public/push-sw.js.
export const RegisterSW = () => {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;
		registerServiceWorker()
			.then((reg) => {
				console.log(`Service worker registered (${SW_URL}):`, reg.scope);
			})
			.catch((err) => {
				console.error("Service worker registration failed:", err);
			});
	}, []);

	return null;
};