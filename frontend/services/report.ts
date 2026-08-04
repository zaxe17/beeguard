// report.ts

import { tokenStore } from "./api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ReportParams = {
	date_from?: string;
	date_to?: string;
	hive_id?: string;
};

function buildYieldReportUrl(params?: ReportParams) {
	const qs = new URLSearchParams();
	if (params?.date_from) qs.set("date_from", params.date_from);
	if (params?.date_to) qs.set("date_to", params.date_to);
	if (params?.hive_id) qs.set("hive_id", params.hive_id);
	const query = qs.toString();
	return `${BASE_URL}/api/reports/yield.pdf${query ? `?${query}` : ""}`;
}

export const reportService = {
	/**
	 * Fetches the yield analytics PDF as a Blob WITHOUT triggering a
	 * browser download. Used to preview it (e.g. in an <iframe>) before
	 * the beekeeper decides to save it — see GenerateReportModal.tsx.
	 */
	fetchYieldReportBlob: async (params?: ReportParams): Promise<Blob> => {
		const token = tokenStore.get();
		const res = await fetch(buildYieldReportUrl(params), {
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		});

		if (!res.ok) {
			throw new Error(`Failed to generate report (${res.status}).`);
		}

		return res.blob();
	},

	/**
	 * Triggers a browser download of the yield analytics PDF straight
	 * away (fetch + save), no preview step. Kept for any caller that
	 * wants the old one-click behavior.
	 */
	downloadYieldReport: async (params?: ReportParams) => {
		const blob = await reportService.fetchYieldReportBlob(params);
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "beeguard-yield-report.pdf";
		document.body.appendChild(a);
		a.click();
		a.remove();
		window.URL.revokeObjectURL(url);
	},
};