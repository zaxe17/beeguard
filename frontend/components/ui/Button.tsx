"use client";
import { Icon } from "@iconify/react";
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
	textSize?: string;
	textColor?: string;
};

export const Button = ({
	label,
	buttonType,
	route,
	width,
	onClick,
	disabled,
	bgNone,
	textSize = "text-base",
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
			className={`${width} shadow-[0px_3px_6px_rgba(0,0,0,0.16),0px_3px_6px_rgba(0,0,0,0.23)] flex justify-center items-center py-1.5 px-3 ${!bgNone ? "bg-linear-to-r from-[#ffdb4f] to-[#eec572]" : "border-2 border-[#e2e2e6]"} rounded-xl ${textSize} text-[#4A2F00] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
			style={{
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
			className={`${width} shadow-[0px_3px_6px_rgba(0,0,0,0.16),0px_3px_6px_rgba(0,0,0,0.23)] flex justify-center items-center py-1.5 px-3 rounded-xl text-base font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${BGcolor}`}
			style={{
				width: width || "100%",
				color: textColor,
			}}>
			{label}
		</button>
	);
};

// BACK BUTTON
export const BackButton = ({
	label,
	route,
	fallbackRoute = "/",
}: {
	label?: string;
	route?: string;
	fallbackRoute?: string;
}) => {
	const router = useRouter();

	const handleClick = () => {
		if (route) {
			router.push(route);
		} else if (window.history.length > 1) {
			router.back();
		} else {
			router.replace(fallbackRoute);
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label={label ?? "Go back"}
			className="ml-3 flex items-center gap-1 cursor-pointer text-base text-[#ffa004]">
			<Icon icon="bx:arrow-back" className="text-2xl text-[#ffa004]" />
			{label}
		</button>
	);
};
