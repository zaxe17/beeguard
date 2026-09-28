// public/push-sw.js — service worker for `npm run dev` ONLY.
//
// In development next-pwa is turned off (next.config.ts: disable in dev),
// and the built public/sw.js can't start under the dev server: it tries
// to pre-cache files from the last `npm run build` that `next dev`
// doesn't serve. So in dev we register THIS small worker instead — push
// notifications only, no caching (so dev pages are never stale either).
//
// Production (`npm run build` + `npm start`) uses next-pwa's sw.js, which
// gets the same push code from worker/index.js. Keep the two in sync.
// Which one is used: SW_URL in services/push.ts.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch (e) {
		data = { body: event.data ? event.data.text() : "" };
	}

	const title = data.title || "BeeGuard";
	const options = {
		body: data.body || "",
		icon: "/assets/icons/icon-192.png",
		badge: "/assets/icons/icon-192.png",
		tag: data.tag || undefined,
		data: { url: data.url || "/" },
		vibrate: [120, 60, 120],
	};

	event.waitUntil(
		(async () => {
			await self.registration.showNotification(title, options);
			const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
			tabs.forEach((tab) => tab.postMessage({ type: "beeguard:push", payload: data }));
		})(),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const target = (event.notification.data && event.notification.data.url) || "/";
	const url = new URL(target, self.location.origin).href;

	event.waitUntil(
		(async () => {
			const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
			for (const tab of tabs) {
				if (new URL(tab.url).origin === self.location.origin && "focus" in tab) {
					await tab.focus();
					if ("navigate" in tab) await tab.navigate(url);
					return;
				}
			}
			await self.clients.openWindow(url);
		})(),
	);
});