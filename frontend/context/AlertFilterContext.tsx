// context/AlertFilterContext.tsx
//
// The beekeeper Alerts search bar + filter live in
// app/beekeeper/alert/layout.tsx, but the lists are in the All and Today
// pages. This shares what was typed / picked with the All, Today and
// History pages. The layout stays mounted when switching tabs, so the
// filter is kept when changing tabs.
//
// UPDATED — alerts now move to History once their 14-day validity ends, so
// "All" never has ended alerts anymore. The old "Past" filter (= ended)
// became "Ongoing" (spraying already started, still within 14 days), and
// "Upcoming" now means the spraying date hasn't come yet.

"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AlertRecord } from "@/services/pesticide";

export type AlertFilter =
	| "all"
	| "high"
	| "medium"
	| "low"
	| "upcoming"
	| "ongoing"
	| "mine";

// Shown in the filter dropdown (components/popup/Filter.tsx), in this order.
export const ALERT_FILTER_OPTIONS: { label: string; value: AlertFilter }[] = [
	{ label: "All Alerts", value: "all" },
	{ label: "High", value: "high" },
	{ label: "Medium", value: "medium" },
	{ label: "Low", value: "low" },
	{ label: "Upcoming", value: "upcoming" },
	{ label: "Ongoing", value: "ongoing" },
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

// Spraying date still ahead.
const isUpcoming = (a: AlertRecord) =>
	new Date(a.scheduled_date).getTime() > Date.now();

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
			list = list.filter(isUpcoming);
			break;
		case "ongoing":
			// Started already (ended ones are in History, not in this list).
			list = list.filter((a) => !isUpcoming(a));
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