// services/cvscan.ts

import { api, ApiEnvelope } from "./api";

export interface CVScanDetection {
	class: string;
	confidence: number;
	// bounding box fields, when the workflow's output block includes
	// them — kept loose since exact shape depends on how the Roboflow
	// workflow is configured.
	[key: string]: unknown;
}

export interface CVScanSpeciesBreakdown {
	class: string;
	count: number;
	avg_confidence: number; // 0-100
}

export interface CVScanResult {
	cvscan_id: string;
	image_url: string;
	identified_species: string | null; // majority/dominant class
	confidence_score: number | null; // 0-100, % of boxes agreeing with the dominant class
	detections: CVScanDetection[];
	species_breakdown: CVScanSpeciesBreakdown[];
}

export const cvScanService = {
	// `file` — a real File/Blob (from <input type="file"> or a
	// canvas.toBlob() capture), sent as multipart/form-data under the
	// field name "image" (matches routes/cv_scan.py's
	// request.files["image"] lookup).
	scan: (file: File) => {
		const form = new FormData();
		form.append("image", file);
		return api.postForm<CVScanResult>("/cv-scans", form);
	},

	// NEW — guest bee identification (/guest). Same endpoint, but sent
	// without a login token so it's recorded as a guest scan (citizen_id
	// NULL) — and doesn't get refused if a beekeeper/admin happens to be
	// signed in on this browser.
	scanAsGuest: (file: File) => {
		const form = new FormData();
		form.append("image", file);
		return api.postFormGuest<CVScanResult>("/cv-scans", form);
	},

	listHistory: () => api.get<CVScanResult[]>("/cv-scans"),
};

export type ApiEnvelopeWithFields<T> = ApiEnvelope<T> & {
	field_errors?: Record<string, string>;
};