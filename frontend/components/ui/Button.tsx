"use client";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

type ButtonProps = {
	label?: ReactNode;
	buttonType?: "button" | "submit" | "reset";
	route?: string;
	width?: string;
	onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	disabled?: boolean;
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
			className="flex justify-center items-center py-1.5 px-3 bg-[#ffdb4f] rounded-xl text-base font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
			style={{
				boxShadow: shadow["shadow-18"],
				width: width || "100%",
			}}>
			{label}
		</button>
	);
};

// CANCEL BUTTON
export const CancelButton = ({ onClick, width, disabled }: ButtonProps) => {
	return (
		<button
			onClick={onClick}
			type="button"
			disabled={disabled}
			className="flex justify-center items-center py-1.5 px-3 bg-transparent rounded-xl border border-[#a6a3a3] border-solid text-base font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
			style={{
				boxShadow: shadow["shadow-18"],
				width: width || "100%",
			}}>
			Cancel
		</button>
	);
};
