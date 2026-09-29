// components/RegisterSW.tsx
"use client";

import { useEffect } from "react";
import { SW_URL, registerServiceWorker } from "@/services/push";
import {
	playNotificationSound,
	unlockNotificationSound,
} from "@/lib/notifySound";

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

	// SOUND — a push arrived while BeeGuard is open (the service worker
	// forwards it here). Chat messages get a softer sound.
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;
		const onMessage = (e: MessageEvent) => {
			if (e.data?.type !== "beeguard:push") return;
			playNotificationSound(
				e.data?.payload?.type === "chat_message" ? "chat" : "notification",
			);
		};
		navigator.serviceWorker.addEventListener("message", onMessage);
		return () => navigator.serviceWorker.removeEventListener("message", onMessage);
	}, []);

	// Browsers only allow sound after the first click/tap/key on the page.
	useEffect(() => {
		const unlock = () => unlockNotificationSound();
		window.addEventListener("pointerdown", unlock);
		window.addEventListener("keydown", unlock);
		return () => {
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
		};
	}, []);

	return null;
};