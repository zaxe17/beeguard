export const isNonEmpty = (v: unknown): boolean =>
	typeof v === "string" && v.trim().length > 0;

export const isEmail = (v: string): boolean =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isPassword = (v: string): boolean =>
	typeof v === "string" &&
	v.length >= 8 &&
	v.length <= 72 &&
	/[A-Za-z]/.test(v) &&
	/\d/.test(v);

export const isContact = (v: string): boolean =>
	/^[0-9+\-\s()]{7,15}$/.test(v.trim());

export interface RegistrationDraft {
	role: "citizen" | "beekeeper";
	first_name: string;
	middle_name: string;
	last_name: string;
	citizenship: string;
	username: string;
	// Address: store BOTH the human-readable label AND the PSGC code
	region: string;         // code
	region_name?: string;   // display
	city: string;           // code
	city_name?: string;     // display
	barangay: string;       // code
	barangay_name?: string; // display
	street: string;
	contact_no: string;
	email: string;
	password: string;
	confirm_password: string;
	farm_name?: string;
	apiary_type?: string;
}

/** Field-mapped errors: { field_name: message }. */
export type FieldErrors = Partial<Record<keyof RegistrationDraft | "form", string>>;

export function validateRegistrationDraftFields(
	d: RegistrationDraft,
): FieldErrors {
	const e: FieldErrors = {};

	if (!isNonEmpty(d.first_name)) e.first_name = "First name is required.";
	if (!isNonEmpty(d.last_name)) e.last_name = "Last name is required.";
	if (!isNonEmpty(d.citizenship)) e.citizenship = "Citizenship is required.";
	if (!isNonEmpty(d.username)) e.username = "Username is required.";

	if (!isNonEmpty(d.region)) e.region = "Please select a region.";
	if (!isNonEmpty(d.city)) e.city = "Please select a city or municipality.";
	if (!isNonEmpty(d.barangay)) e.barangay = "Please select a barangay.";

	if (!isNonEmpty(d.contact_no)) {
		e.contact_no = "Contact number is required.";
	} else if (!isContact(d.contact_no)) {
		e.contact_no =
			"Phone must be 7–15 characters (digits, +, -, spaces, or parentheses).";
	}

	if (!isNonEmpty(d.email)) {
		e.email = "Email address is required.";
	} else if (!isEmail(d.email)) {
		e.email = "Please enter a valid email address.";
	}

	if (!isPassword(d.password)) {
		e.password =
			"Password must be 8–72 chars and include both letters and numbers.";
	}
	if (d.password !== d.confirm_password) {
		e.confirm_password = "Passwords do not match.";
	}

	if (d.role === "beekeeper") {
		if (!isNonEmpty(d.farm_name || "")) {
			e.farm_name = "Farm name is required.";
		}
		if (
			!d.apiary_type ||
			!["Commercial Farm", "Backyard", "Rooftop", "Wild/Forest"].includes(
				d.apiary_type,
			)
		) {
			e.apiary_type = "Please choose an apiary type.";
		}
	}

	return e;
}

/** Legacy flat-list validator, kept for backward compatibility. */
export function validateRegistrationDraft(d: RegistrationDraft): string[] {
	const fe = validateRegistrationDraftFields(d);
	return Object.values(fe).filter(Boolean) as string[];
}

/** Compose address string using human-readable names. */
export function composeAddress(d: RegistrationDraft): string {
	return [
		d.street,
		d.barangay_name || d.barangay,
		d.city_name || d.city,
		d.region_name || d.region,
	]
		.filter((x) => isNonEmpty(x))
		.join(", ");
}

export function composeName(d: RegistrationDraft): string {
	return [d.first_name, d.middle_name, d.last_name]
		.filter((x) => isNonEmpty(x))
		.join(" ");
}
