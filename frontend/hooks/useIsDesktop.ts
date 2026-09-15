"use client";

import { useEffect, useState } from "react";

export const useIsDesktop = () => {
	const [isDesktop, setIsDesktop] = useState(true);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 1024px)");
		setIsDesktop(mq.matches);

		const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return isDesktop;
};
