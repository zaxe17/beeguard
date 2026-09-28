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
    apiary_type?: "Commercial Farm" | "Backyard" | "Rooftop" | "Wild/Forest";
}

export interface LoginPayload {
    role?: Role;
    identifier: string;
    password: string;
    remember_me?: boolean;
}

export type BeekeeperVerificationStatus =
    | "Unverified"
    | "Pending"
    | "Verified"
    | "Rejected";

export interface AuthUser {
    id: string;
    role: Role;
    name: string;
    email: string;
    username?: string;
    // Present for citizen/beekeeper when GET /auth/me returns it — the
    // user's stored farm/home pin. `null` if never set (or only
    // partially set) at registration; undefined for admins.
    latitude?: number | null;
    longitude?: number | null;
    // Beekeeper-only — undefined for citizens/admins. Certain features
    // (e.g. the Report tab) are gated on this being "Verified".
    verification_status?: BeekeeperVerificationStatus;
    // Citizen/beekeeper own profile photo ("/uploads/profile/...");
    // null = default picture. Shown via <ProfilePhoto me />.
    profile_photo?: string | null;
}

export interface LoginData {
    token: string;
    user: AuthUser;
}

/** Backend now includes field_errors on validation failures. */
export type ApiEnvelopeWithFields<T> = ApiEnvelope<T> & {
    field_errors?: Record<string, string>;
};

export interface CheckUniquePayload {
    role: "citizen" | "beekeeper";
    username?: string;
    email?: string;
    contact_no?: string;
}

export interface VerifyOtpPayload {
    role: "citizen" | "beekeeper";
    email: string;
    code: string;
}

export interface ResendOtpPayload {
    role: "citizen" | "beekeeper";
    email: string;
}

// ── FORGOT PASSWORD (NEW) ──
export interface ForgotPasswordPayload {
    email: string;
}

export interface VerifyResetCodePayload {
    email: string;
    code: string;
}

export interface VerifyResetCodeData {
    reset_token: string;
    expires_in_minutes: number;
}

export interface ResetPasswordPayload {
    reset_token: string;
    password: string;
    confirm_password: string;
}

export const authService = {
    register: (payload: RegisterPayload) =>
        api.post<{ id: string; role: Role; username: string; email: string }>(
            "/auth/register",
            payload,
        ) as Promise<
            ApiEnvelopeWithFields<{
                id: string;
                role: Role;
                username: string;
                email: string;
            }>
        >,

    checkUnique: (payload: CheckUniquePayload) =>
        api.post<{ available: boolean }>(
            "/auth/check-unique",
            payload,
        ) as Promise<ApiEnvelopeWithFields<{ available: boolean }>>,

    verifyOtp: (payload: VerifyOtpPayload) =>
        api.post<Record<string, never>>(
            "/auth/verify-otp",
            payload,
        ) as Promise<ApiEnvelopeWithFields<Record<string, never>>>,

    resendOtp: (payload: ResendOtpPayload) =>
        api.post<Record<string, never>>("/auth/resend-otp", payload),

    login: async (payload: LoginPayload): Promise<ApiEnvelope<LoginData>> => {
        const res = await api.post<LoginData>("/auth/login", payload);
        // Remember me: ticked -> token kept after the browser closes
        // (localStorage); unticked -> only for this browser session.
        if (res.success && res.data?.token)
            tokenStore.set(res.data.token, !!payload.remember_me);
        return res;
    },

    // Forgot Password step 1 — also used for "Resend Code".
    forgotPassword: (payload: ForgotPasswordPayload) =>
        api.post<Record<string, never>>("/auth/forgot-password", payload),

    // Step 2 — returns a short-lived reset_token.
    verifyResetCode: (payload: VerifyResetCodePayload) =>
        api.post<VerifyResetCodeData>(
            "/auth/verify-reset-code",
            payload,
        ) as Promise<ApiEnvelopeWithFields<VerifyResetCodeData>>,

    // Step 3 — set the new password.
    resetPassword: (payload: ResetPasswordPayload) =>
        api.post<Record<string, never>>(
            "/auth/reset-password",
            payload,
        ) as Promise<ApiEnvelopeWithFields<Record<string, never>>>,

    me: () => api.get<AuthUser>("/auth/me"),

    logout: () => tokenStore.clear(),
};

/**
 * Request browser geolocation once. Resolves to { latitude, longitude } or
 * { latitude: null, longitude: 0 } if permission denied.
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