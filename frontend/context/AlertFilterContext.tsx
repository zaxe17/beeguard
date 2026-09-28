// context/AlertFilterContext.tsx
//
// The beekeeper Alerts search bar + filter live in
// app/beekeeper/alert/layout.tsx, but the lists are in the All and Today
// pages. This shares what was typed / picked with both pages. The layout
// stays mounted when switching between All and Today, so the filter is
// kept when changing tabs.

"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AlertRecord } from "@/services/pesticide";

export type AlertFilter =
	| "all"
	| "high"
	| "medium"
	| "low"
	| "upcoming"
	| "past"
	| "mine";

// Shown in the filter dropdown (components/popup/Filter.tsx), in this order.
export const ALERT_FILTER_OPTIONS: { label: string; value: AlertFilter }[] = [
	{ label: "All Alerts", value: "all" },
	{ label: "High", value: "high" },
	{ label: "Medium", value: "medium" },
	{ label: "Low", value: "low" },
	{ label: "Upcoming", value: "upcoming" },
	{ label: "Past", value: "past" },
	{ label: "My Alerts", value: "mine" },
];

type AlertFilterValue = {
	filter: AlertFilter;
	setFilter: (f: AlertFilter) => void;
	search: string;
	setSearch: (s: string) => void;
};

const AlertFilterContext = createContext<AlertFilterValue | null>(null);

export const AlertFilterProvider = ({ children }: { children: ReactNode }) => {
	const [filter, setFilter] = useState<AlertFilter>("all");
	const [search, setSearch] = useState("");
	const value = useMemo(
		() => ({ filter, setFilter, search, setSearch }),
		[filter, search],
	);
	return (
		<AlertFilterContext.Provider value={value}>{children}</AlertFilterContext.Provider>
	);
};

/** Current filter + search. Works outside the provider too (no filtering). */
export const useAlertFilter = (): AlertFilterValue =>
	useContext(AlertFilterContext) ?? {
		filter: "all",
		setFilter: () => {},
		search: "",
		setSearch: () => {},
	};

// An alert is "past" once its spraying ended (expiration_date), or — when
// it has no end date — once its scheduled day is over.
const isPast = (a: AlertRecord) => {
	const end = a.expiration_date
		? new Date(a.expiration_date)
		: (() => {
				const d = new Date(a.scheduled_date);
				d.setHours(23, 59, 59, 999);
				return d;
			})();
	return end.getTime() < Date.now();
};

/**
 * Applies the picked filter and the search text.
 * `locationOf` gives the "Barangay, City" shown on the card, so searching
 * "Moonwalk" matches what the beekeeper sees.
 */
export function filterAlerts(
	alerts: AlertRecord[],
	filter: AlertFilter,
	search: string,
	locationOf: (a: AlertRecord) => string,
	myId?: string | null,
): AlertRecord[] {
	let list = alerts;

	switch (filter) {
		case "high":
		case "medium":
		case "low":
			list = list.filter((a) => (a.risk_level || "").toLowerCase() === filter);
			break;
		case "upcoming":
			list = list.filter((a) => !isPast(a));
			break;
		case "past":
			list = list.filter(isPast);
			break;
		case "mine":
			list = list.filter((a) => !!myId && a.reported_by_beekeeper_id === myId);
			break;
	}

	const q = search.trim().toLowerCase();
	if (q) {
		list = list.filter((a) =>
			[locationOf(a), a.title, a.pesticide_type, a.risk_level]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q)),
		);
	}
	return list;
}

/** Empty-list message that says why nothing is showing. */
export function emptyMessage(
	filter: AlertFilter,
	search: string,
	fallback: string,
): string {
	if (search.trim()) return `No alerts match "${search.trim()}".`;
	const picked = ALERT_FILTER_OPTIONS.find((o) => o.value === filter);
	if (filter !== "all" && picked) return `No alerts under "${picked.label}".`;
	return fallback;
}