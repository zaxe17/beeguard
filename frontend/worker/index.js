// worker/index.js — BeeGuard push notifications.
//
// next-pwa (v5) bundles this file and adds it to the generated
// public/sw.js automatically (that's the importScripts(...) line in
// sw.js) — so DON'T edit public/sw.js by hand; it's rebuilt on every
// `npm run build` and your changes would be lost.
//
// Workbox in sw.js already does skipWaiting / clientsClaim and caching;
// this file only adds:
//   push              -> show the notification on the phone / computer
//   notificationclick -> open (or focus) BeeGuard on the right page
//
// The server sends JSON: { title, body, url, tag, type }
// (server/services/push_service.py).

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
		tag: data.tag || undefined, // same tag replaces instead of stacking
		// A replaced notification (same tag, e.g. the next chat message)
		// still makes a sound / pops up again.
		renotify: !!data.tag,
		silent: false,
		data: { url: data.url || "/" },
		vibrate: [120, 60, 120],
	};

	event.waitUntil(
		(async () => {
			const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
			// Someone is looking at BeeGuard right now -> the page plays its
			// own sound and updates the bell (components/RegisterSW.tsx), so
			// skip the system pop-up (no double sound). Otherwise -> pop-up
			// with the computer's / phone's notification sound.
			const watching = tabs.some((t) => t.visibilityState === "visible" && t.focused);
			if (!watching) {
				await self.registration.showNotification(title, options);
			}
			// Tell open BeeGuard tabs to refresh their bell badge (and ding).
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
			// A BeeGuard tab is already open -> use it.
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