// services/profile.ts
//
// The logged-in citizen's / beekeeper's own profile (routes/profile.py).

import { api, type ApiEnvelope } from "./api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** "/uploads/profile/x.jpg" from the API -> full URL (undefined = no photo). */
export const mediaSrc = (path: string | null | undefined): string | undefined => {
	if (!path) return undefined;
	if (/^https?:\/\//.test(path)) return path;
	return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

export type PhotoKind = "profile" | "farm";
export const PHOTO_MAX_MB = 5;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export type ApiaryType = "Commercial Farm" | "Backyard" | "Rooftop" | "Wild/Forest";
export const APIARY_TYPES: ApiaryType[] = ["Commercial Farm", "Backyard", "Rooftop", "Wild/Forest"];

export interface MyProfile {
	id: string;
	role: "citizen" | "beekeeper";
	name: string;
	username: string;
	email: string; // read-only (tied to the verification code)
	contact_no: string;
	citizenship: string | null;
	latitude: number | null;
	longitude: number | null;
	created_at: string | null;
	profile_photo: string | null; // "/uploads/profile/..." or null = default
	// beekeepers only
	farm_photo?: string | null;
	farm_name?: string | null;
	apiary_type?: ApiaryType | null;
	verification_status?: string | null;
}

export type ProfileUpdate = Partial<
	Pick<MyProfile, "name" | "username" | "contact_no" | "latitude" | "longitude" | "farm_name" | "apiary_type">
>;

// Validation errors per field ("name", "username", "contact_no",
// "location", "current_password", ...), shown under each input.
export type WithFieldErrors<T> = ApiEnvelope<T> & { field_errors?: Record<string, string> };

export const profileService = {
	get: () => api.get<MyProfile>("/profile"),

	update: (changes: ProfileUpdate) =>
		api.patch<MyProfile>("/profile", changes) as Promise<WithFieldErrors<MyProfile>>,

	changePassword: (current_password: string, new_password: string, confirm_password: string) =>
		api.post("/profile/password", {
			current_password,
			new_password,
			confirm_password,
		}) as Promise<WithFieldErrors<unknown>>,

	// Profile photo (citizen / beekeeper) or bee farm photo (beekeeper).
	uploadPhoto: (kind: PhotoKind, file: File) => {
		const form = new FormData();
		form.append("photo", file);
		return api.postForm<{ type: PhotoKind; url: string }>(`/profile/photo?type=${kind}`, form);
	},

	removePhoto: (kind: PhotoKind) =>
		api.delete<{ type: PhotoKind; url: null }>(`/profile/photo?type=${kind}`),
};

/** Checks a picked file before uploading. Returns an error message or null. */
export const checkPhotoFile = (file: File): string | null => {
	if (!PHOTO_ACCEPT.split(",").includes(file.type)) return "Choose a JPG, PNG or WEBP image.";
	if (file.size > PHOTO_MAX_MB * 1024 * 1024) return `The photo must be ${PHOTO_MAX_MB} MB or smaller.`;
	return null;
};