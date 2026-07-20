"use client";

import { Icon } from "@iconify/react";
import { getHoverColor } from "chart.js/helpers";
import React, { useState } from "react";

interface ContainerProps {
	children?: React.ReactNode;
	title?: string;
}

export type AlertProps = {
	location?: string;
	date: string;
	time: string;
	status: "high" | "medium" | "low";
};

const alertLevels = {
	high: {
		text: "#e63946",
		bg: "#ff0000",
	},
	medium: {
		text: "#f77f00",
		bg: "#ff9a00",
	},
	low: {
		text: "#2d9d5f",
		bg: "#00cc00",
	},
};

export const PesticideAlert = ({
	location,
	date,
	time,
	status,
}: AlertProps) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<div
			className="px-3 flex items-start rounded-2xl border hover:bg-[#fff1ad]/60 transition-all duration-100 ease-in hover:scale-102 cursor-pointer"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{
				boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
				borderColor: alertLevels[status].bg,
				background: isHovered
					? getHoverColor(`${alertLevels[status].bg}33`)
					: "transparent",
			}}>
			<div className="w-full h-20 flex items-center gap-3">
				<div className="w-15 h-15">
					<Icon
						icon="line-md:alert-twotone"
						className="w-full h-full block"
						style={{ color: alertLevels[status].bg }}
					/>
				</div>

				{/* ALERT DETAILS */}
				<div className="w-full flex flex-col text-[#817b70] text-xs capitalize">
					<div className="flex justify-between items-center text-base">
						<h3
							className="Poppins-Bold text-black"
							style={{
								color: alertLevels[status].bg,
							}}>
							Pestiside Spraying Alert
						</h3>

						{/* ALERT STATUS */}
						<span
							className="Poppins-SemiBold w-18 text-xs text-center py-1 px-3 rounded-md"
							style={{
								color: alertLevels[status].bg,
								background: `${alertLevels[status].bg}4D`,
							}}>
							{status}
						</span>
					</div>

					{/* LOCATION */}
					<span className="Poppins-SemiBold">{location}</span>
					{/* DATE & TIME */}
					<span className="Poppins-SemiBold">
						{date} • {time}
					</span>
				</div>
			</div>
		</div>
	);
};

// ALERT DETAILS
export const AlertContainer = ({ children, title }: ContainerProps) => {
	return (
		<div className="w-full flex flex-col gap-2">
			<h1 className="Poppins-SemiBold text-xl">{title}</h1>
			<div
				className="p-3 flex items-start rounded-lg"
				style={{
					boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
				}}>
				{children}
			</div>
		</div>
	);
};
