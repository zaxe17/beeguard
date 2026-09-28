// services/verification.ts
//
// Beekeeper account verification (routes/verification.py) and the
// private document viewer used by both the beekeeper and the admin.

import { api, tokenStore } from "./api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type VerificationStatus = "Unverified" | "Pending" | "Verified" | "Rejected";

export interface VerificationInfo {
	beekeeperID: string;
	name: string | null;
	farm_name: string | null;
	email: string | null;
	contact_no: string | null;
	address: string | null;
	apiary_type: string | null;
	status: VerificationStatus;
	document_type: string | null;
	has_document: boolean;
	submitted_at: string | null;
	reviewed_at: string | null;
	rejection_reason: string | null;
}

// Fired after a submit / admin review so AuthContext re-reads
// verification_status (unlocks the Report tab without re-login).
export const AUTH_REFRESH_EVENT = "beeguard:auth-refresh";

export const verificationService = {
	documentTypes: () => api.get<string[]>("/verification/document-types"),

	mine: () => api.get<VerificationInfo>("/verification/me"),

	submit: (documentType: string, file: File) => {
		const form = new FormData();
		form.append("document_type", documentType);
		form.append("document", file);
		return api.postForm<VerificationInfo>("/verification", form);
	},

	/**
	 * Downloads the (private) document with the login token and returns
	 * a temporary object URL for <img>/<iframe>. Call
	 * URL.revokeObjectURL(url) when done with it.
	 */
	fetchDocument: async (beekeeperId: string): Promise<{ url: string; type: string }> => {
		const token = tokenStore.get();
		const res = await fetch(
			`${BASE_URL}/api/verification/document/${encodeURIComponent(beekeeperId)}`,
			{ headers: token ? { Authorization: `Bearer ${token}` } : {} },
		);
		if (!res.ok) {
			let message = `Couldn't load the document (${res.status}).`;
			try {
				const body = await res.json();
				if (body?.message) message = body.message;
			} catch {
				/* not JSON */
			}
			throw new Error(message);
		}
		const blob = await res.blob();
		return { url: URL.createObjectURL(blob), type: blob.type };
	},
};