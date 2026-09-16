"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Generic hook para sa URL-driven state (query param).
 * Ginagamit ito sa mga overlay/selection na dapat naka-reflect sa URL
 * (hal. "?notif=open" sa UserNav, "?chat=<id>" sa ChatPage) para:
 *  - browser back button gumana nang tama
 *  - shareable/refreshable ang URL
 *
 * @param key      pangalan ng query param, hal. "notif" o "chat"
 */
export function useQueryParamState(key: string) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const value = searchParams.get(key);

	const setValue = useCallback(
		(newValue: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(key, newValue);
			router.push(`${pathname}?${params.toString()}`);
		},
		[key, pathname, router, searchParams],
	);

	const clearValue = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete(key);
		const query = params.toString();
		router.push(query ? `${pathname}?${query}` : pathname);
	}, [key, pathname, router, searchParams]);

	return { value, setValue, clearValue } as const;
}
