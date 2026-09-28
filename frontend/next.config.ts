// next.config.ts
import type { NextConfig } from "next";
import path from "path";

// next-pwa's built-in caching rules (fonts, images, JS/CSS, pages...).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const defaultRuntimeCaching = require("next-pwa/cache");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
	dest: "public",
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === "development",
	buildExcludes: [
		/app-build-manifest\.json$/,
		/_buildManifest\.js$/,
		/_ssgManifest\.js$/,
		/middleware-manifest\.json$/,
		/\.map$/,
	],

	// OFFLINE MODE
	// (No `fallbacks` option here — next-pwa 5.6 crashes with it on the
	// App Router: "Cannot read properties of undefined (reading
	// 'precacheFallback')".)
	// Don't reload the whole page when the internet comes back — the app
	// syncs and refreshes its own data (components/OfflineBanner.tsx), and
	// a reload would wipe a half-filled form.
	reloadOnOnline: false,
	runtimeCaching: [
		// Backend API calls (/api/...) are NEVER cached by the service
		// worker: it can't tell users apart, so one beekeeper's data could
		// show for another on a shared phone. services/api.ts keeps its own
		// per-user offline copy instead.
		{
			urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
			handler: "NetworkOnly",
		},
		...defaultRuntimeCaching,
	],
});

const nextConfig: NextConfig = {
	allowedDevOrigins: [process.env.DEV_IP ?? "127.0.0.1"],
	turbopack: {
		root: path.join(__dirname),
	},
	devIndicators: false,
};

export default withPWA(nextConfig);