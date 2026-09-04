import type { NextConfig } from "next";
import path from "path";

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
});

const nextConfig: NextConfig = {
	allowedDevOrigins: [process.env.DEV_IP ?? "127.0.0.1"],
	turbopack: {
		root: path.join(__dirname),
	},
	devIndicators: false,
};

export default withPWA(nextConfig);