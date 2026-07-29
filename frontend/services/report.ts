import { tokenStore } from "./api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const reportService = {
	/**
	 * Triggers a browser download of the yield analytics PDF.
	 * Uses a raw fetch (not the api.ts wrapper) because the response
	 * is a binary PDF stream, not the {success,message,data} envelope.
	 */
	downloadYieldReport: async (params?: {
		date_from?: string;
		date_to?: string;
		hive_id?: string;
	}) => {
		const qs = new URLSearchParams();
		if (params?.date_from) qs.set("date_from", params.date_from);
		if (params?.date_to) qs.set("date_to", params.date_to);
		if (params?.hive_id) qs.set("hive_id", params.hive_id);
		const query = qs.toString();

		const token = tokenStore.get();
		const res = await fetch(
			`${BASE_URL}/api/reports/yield.pdf${query ? `?${query}` : ""}`,
			{ headers: token ? { Authorization: `Bearer ${token}` } : {} },
		);

		if (!res.ok) {
			throw new Error(`Failed to generate report (${res.status}).`);
		}

		const blob = await res.blob();
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