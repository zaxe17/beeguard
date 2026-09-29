// lib/phone.ts
//
// Philippine mobile numbers. The app shows "+63" in front of the number
// box and SAVES only the 10 digits after it (e.g. "9171234567") — same
// rule as the backend (server/validators/auth_validator.py →
// normalize_ph_mobile).

/**
 * Whatever was typed/pasted -> at most 10 digits after +63.
 * "09171234567", "+63 917 123 4567", "639171234567" -> "9171234567"
 */
export const toPhDigits = (raw: string | null | undefined): string => {
	let d = (raw ?? "").replace(/\D/g, "");
	if (d.startsWith("63") && d.length > 10) d = d.slice(2);
	if (d.startsWith("0")) d = d.slice(1);
	return d.slice(0, 10);
};

/** Valid PH mobile number: 10 digits starting with 9 (after +63). */
export const isPhMobile = (raw: string | null | undefined): boolean =>
	/^9\d{9}$/.test(toPhDigits(raw));

/** For display: "9171234567" -> "+63 917 123 4567". */
export const formatPhMobile = (raw: string | null | undefined): string => {
	const d = toPhDigits(raw);
	if (!d) return "";
	if (d.length !== 10) return `+63 ${d}`;
	return `+63 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

export const PH_MOBILE_ERROR =
	"Enter 10 digits after +63, starting with 9 (e.g. 9171234567).";