import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: [process.env.DEV_IP ?? "127.0.0.1"],
};

export default nextConfig;
