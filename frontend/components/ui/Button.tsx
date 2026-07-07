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
		<div className="flex justify-center">
			<button
				onClick={handleClick}
				type={buttonType}
				disabled={disabled}
				className="flex justify-center items-center p-1.5 bg-[#ffdb4f] rounded-xl text-base font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
				style={{
					boxShadow: shadow["shadow-18"],
					width: width || "100%",
				}}>
				{label}
			</button>
		</div>
	);
};
