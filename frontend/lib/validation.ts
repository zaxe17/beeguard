export const isNonEmpty = (v: unknown): boolean =>
	typeof v === "string" && v.trim().length > 0;

export const isEmail = (v: string): boolean =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isPassword = (v: string): boolean =>
	typeof v === "string" && v.length >= 8 && v.length <= 72;

export const isContact = (v: string): boolean =>
	/^[0-9+\-\s()]{7,15}$/.test(v.trim());

export interface RegistrationDraft {
	role: "citizen" | "beekeeper";
	first_name: string;
	middle_name: string;
	last_name: string;
	citizenship: string;
	username: string;
	region: string;
	city: string;
	barangay: string;
	street: string;
	contact_no: string;
	email: string;
	password: string;
	confirm_password: string;
	farm_name?: string;
	apiary_type?: string;
}

export function validateRegistrationDraft(d: RegistrationDraft): string[] {
	const errs: string[] = [];
	if (!isNonEmpty(d.first_name)) errs.push("First name is required.");
	if (!isNonEmpty(d.last_name)) errs.push("Last name is required.");
	if (!isNonEmpty(d.citizenship)) errs.push("Citizenship is required.");
	if (!isNonEmpty(d.username)) errs.push("Username is required.");
	if (!isNonEmpty(d.region)) errs.push("Region is required.");
	if (!isNonEmpty(d.city)) errs.push("City / Municipality is required.");
	if (!isNonEmpty(d.barangay)) errs.push("Barangay is required.");
	if (!isNonEmpty(d.contact_no) || !isContact(d.contact_no))
		errs.push("Valid contact number is required.");
	if (!isNonEmpty(d.email) || !isEmail(d.email))
		errs.push("Valid email address is required.");
	if (!isPassword(d.password))
		errs.push("Password must be 8–72 characters.");
	if (d.password !== d.confirm_password)
		errs.push("Passwords do not match.");

	if (d.role === "beekeeper") {
		if (
			!d.apiary_type ||
			!["Commercial Farm", "Backyard", "Rooftop", "Wild/Forest"].includes(
				d.apiary_type,
			)
		)
			errs.push("Please choose an apiary type.");
	}
	return errs;
}

/** Compose the address string from parts (schema uses one 'address' column). */
export function composeAddress(d: RegistrationDraft): string {
	return [d.street, d.barangay, d.city, d.region]
		.filter((x) => isNonEmpty(x))
		.join(", ");
}

/** Compose full name (schema uses one 'name' column). */
export function composeName(d: RegistrationDraft): string {
	return [d.first_name, d.middle_name, d.last_name]
		.filter((x) => isNonEmpty(x))
		.join(" ");
}
