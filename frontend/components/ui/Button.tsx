"use client";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

type ButtonProps = {
	label?: ReactNode;
	buttonType?: "button" | "submit" | "reset";
	route?: string;
	width?: string;
	BGcolor?: string;
	onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	disabled?: boolean;
	bgNone?: boolean;
	textColor?: string;
};

const shadow = {
	"shadow-18":
		"rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px",
};

export const Button = ({
	label,
	buttonType,
	route,
	width,
	onClick,
	disabled,
	bgNone,
}: ButtonProps) => {
	const router = useRouter();

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (disabled) return;
		if (onClick) {
			onClick(e);
			return;
		}
		if (route) router.push(route);
	};

	return (
		<button
			onClick={handleClick}
			type={buttonType}
			disabled={disabled}
			className={`flex justify-center items-center py-1.5 px-3 ${!bgNone ? "bg-linear-to-r from-[#ffdb4f] to-[#eec572]" : "border-2 border-[#e2e2e6]"} rounded-xl text-base text-[#4A2F00] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
			style={{
				boxShadow: shadow["shadow-18"],
				width: width || "100%",
			}}>
			{label}
		</button>
	);
};

// CANCEL BUTTON
export const CancelButton = ({
	onClick,
	width,
	disabled,
	label = "Cancel",
	BGcolor,
	textColor = "#4A2F00",
}: ButtonProps) => {
	return (
		<button
			onClick={onClick}
			type="button"
			disabled={disabled}
			className={`flex justify-center items-center py-1.5 px-3 rounded-xl border border-[#a6a3a3] border-solid text-base font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${BGcolor}`}
			style={{
				boxShadow: shadow["shadow-18"],
				width: width || "100%",
				color: textColor,
			}}>
			{label}
		</button>
	);
};
