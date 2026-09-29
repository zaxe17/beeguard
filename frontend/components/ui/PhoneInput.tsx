// components/ui/PhoneInput.tsx
"use client";

import { ReactNode } from "react";
import { toPhDigits } from "@/lib/phone";

/**
 * Mobile number box with a fixed "+63" in front. The user only types
 * the 10 digits after it (e.g. 9171234567); anything else — letters,
 * a leading 0, or more than 10 digits — is dropped as they type.
 * `onChange` receives those digits only, which is what gets saved.
 * Looks like the regular <Input> (components/ui/Input.tsx).
 */
type PhoneInputProps = {
	label?: ReactNode;
	value: string;
	onChange?: (digits: string) => void;
	error?: boolean;
	disabled?: boolean;
	height?: number;
};

export const PhoneInput = ({
	label = "Contact Number",
	value,
	onChange,
	error,
	disabled,
	height,
}: PhoneInputProps) => {
	const heightStyle = height ? { height: `${height}px` } : undefined;

	return (
		<div className="flex flex-col w-full gap-1">
			<label
				className={`lg:text-base text-sm ${
					error ? "text-red-600" : "text-[#4a2f00]"
				}`}>
				{label}
			</label>
			<div
				className={`w-full flex items-stretch border ${
					error ? "border-red-600" : "border-[#a6a3a3]"
				} rounded-lg bg-white/70 overflow-hidden ${
					disabled ? "opacity-60 cursor-not-allowed" : ""
				}`}
				style={heightStyle}>
				<span className="shrink-0 px-2.5 flex items-center text-sm text-[#4a2f00] bg-[#f3eed8] border-r border-[#a6a3a3] select-none">
					+63
				</span>
				<input
					type="tel"
					inputMode="numeric"
					autoComplete="tel-national"
					placeholder="9XXXXXXXXX"
					maxLength={10}
					value={toPhDigits(value)}
					disabled={disabled}
					onChange={(e) => onChange?.(toPhDigits(e.target.value))}
					className="flex-1 min-w-0 text-sm lg:h-8 h-10 p-2.5 outline-0 bg-transparent disabled:cursor-not-allowed"
					style={heightStyle}
				/>
			</div>
		</div>
	);
};