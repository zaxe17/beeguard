import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
	allowedDevOrigins: [process.env.DEV_IP ?? "127.0.0.1"],
	turbopack: {
		root: path.join(__dirname),
	},
};

export default nextConfig;
