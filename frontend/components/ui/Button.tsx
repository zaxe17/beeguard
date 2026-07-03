"use client";
import { useRouter } from "next/navigation";

type ButtonProps = {
	label?: string;
	buttonType?: "button" | "submit" | "reset";
	route?: string;
	width?: string;
};

const shadow = {
	"shadow-18":
		"rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px",
};

export const Button = ({ label, buttonType, route, width }: ButtonProps) => {
	const router = useRouter();

	return (
		<div className="flex justify-center">
			<button
				onClick={() => router.push(`${route}`)}
				type={buttonType}
				className="flex justify-center items-center p-1.5 bg-[#ffdb4f] rounded-xl text-base font-bold cursor-pointer"
				style={{ boxShadow: shadow["shadow-18"], width: width || "100%" }}>
				{label}
			</button>
		</div>
	);
};
