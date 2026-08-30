"use client";

import { useEffect } from "react";

export const RegisterSW = () => {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js")
				.then((reg) => {
					console.log("Service worker registered:", reg.scope);
				})
				.catch((err) => {
					console.error("Service worker registration failed:", err);
				});
		}
	}, []);

	return null;
};