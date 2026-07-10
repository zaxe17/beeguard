// Central fetch wrapper. Handles base URL, JSON headers, Authorization,
// and normalizes the backend's { success, message, data|errors } envelope.

export type ApiEnvelope<T = unknown> = {
	success: boolean;
	message: string;
	data?: T;
	errors?: string[];
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "beeguard_token";

export const tokenStore = {
	get: (): string | null => {
		if (typeof window === "undefined") return null;
		return window.localStorage.getItem(TOKEN_KEY);
	},
	set: (token: string) => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(TOKEN_KEY, token);
	},
	clear: () => {
		if (typeof window === "undefined") return;
		window.localStorage.removeItem(TOKEN_KEY);
	},
};

async function request<T>(
	path: string,
	options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
		...((options.headers as Record<string, string>) || {}),
	};

	const token = tokenStore.get();
	if (token) headers["Authorization"] = `Bearer ${token}`;

	let res: Response;
	try {
		res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
	} catch (err) {
		return {
			success: false,
			message: "Network error. Is the backend running?",
			errors: [String(err)],
		};
	}

	let body: ApiEnvelope<T>;
	try {
		body = (await res.json()) as ApiEnvelope<T>;
	} catch {
		return {
			success: false,
			message: `Unexpected server response (${res.status}).`,
			errors: [],
		};
	}
	return body;
}

export const api = {
	get: <T>(path: string) => request<T>(path, { method: "GET" }),
	post: <T>(path: string, body: unknown) =>
		request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
