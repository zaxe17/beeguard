import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "BeeGuard",
	description: "Beekeeping management and swarm coordination platform",
	manifest: "/manifest.json",
	// themeColor: "#ffce1c",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<head>
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css"
					integrity="sha512-2SwdPD6INVrV/lHTZbO2nodKhrnDdJK9/kg2XD1r9uGqPo1cUbujc+IYdlYdEErWNu69gVcYgdxlmVmzTWnetw=="
					crossOrigin="anonymous"
					referrerPolicy="no-referrer"
				/>
			</head>
			<body className="min-h-full flex flex-col">
				<RegisterSW />
				<AuthProvider>{children}</AuthProvider>
			</body>
		</html>
	);
}