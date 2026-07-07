import { api, tokenStore, ApiEnvelope } from "./api";

export type Role = "citizen" | "beekeeper" | "admin";

export interface RegisterPayload {
	role: "citizen" | "beekeeper";
	name: string;
	citizenship: string;
	address?: string | null;
	latitude?: number | null;
	longitude: number;
	username: string;
	password: string;
	confirm_password: string;
	contact_no: string;
	email: string;
	terms_accepted: boolean;
	// beekeeper-only
	farm_name?: string | null;
	apiary_type?:
		| "Commercial Farm"
		| "Backyard"
		| "Rooftop"
		| "Wild/Forest";
}

export interface LoginPayload {
	role: Role;
	identifier: string; // username or email
	password: string;
}

export interface AuthUser {
	id: string;
	role: Role;
	name: string;
	email: string;
	username?: string;
}

export interface LoginData {
	token: string;
	user: AuthUser;
}

export const authService = {
	register: (payload: RegisterPayload) =>
		api.post<{ id: string; role: Role; username: string; email: string }>(
			"/auth/register",
			payload,
		),

	login: async (payload: LoginPayload): Promise<ApiEnvelope<LoginData>> => {
		const res = await api.post<LoginData>("/auth/login", payload);
		if (res.success && res.data?.token) tokenStore.set(res.data.token);
		return res;
	},

	me: () => api.get<AuthUser>("/auth/me"),

	logout: () => tokenStore.clear(),
};

/**
 * Request browser geolocation once. Resolves to { latitude, longitude } or
 * { latitude: null, longitude: 0 } if permission denied. Longitude is required
 * by the DB schema, so we fall back to 0 rather than blocking registration.
 */
export function getCoordinatesOrFallback(): Promise<{
	latitude: number | null;
	longitude: number;
}> {
	return new Promise((resolve) => {
		if (typeof window === "undefined" || !("geolocation" in navigator)) {
			resolve({ latitude: null, longitude: 0 });
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) =>
				resolve({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				}),
			() => resolve({ latitude: null, longitude: 0 }),
			{ enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 },
		);
	});
}
