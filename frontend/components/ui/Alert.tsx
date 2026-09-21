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
	// NEW: wired up so the card is actually clickable, not just
	// styled like it (it already had cursor-pointer/hover before,
	// with nothing behind it).
	onClick?: () => void;
};

const alertLevels = {
	high: {
		text: "#e63946",
		bg: "#ff0000",
		hoverBg: "#ffe0e0",
	},
	medium: {
		text: "#f77f00",
		bg: "#ff9a00",
		hoverBg: "#ffedd1",
	},
	low: {
		text: "#2d9d5f",
		bg: "#00cc00",
		hoverBg: "#dcf7e3",
	},
};

export const PesticideAlert = ({
	location,
	date,
	time,
	status,
	onClick,
}: AlertProps) => {
	return (
		<div
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onClick={onClick}
			onKeyDown={(e) => {
				if (onClick && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					onClick();
				}
			}}
			className="group relative pb-1">
			{/* PEEK BORDER */}
			<div
				className="absolute inset-x-0 top-1 bottom-0 rounded-2xl transition-all duration-150 ease-in group-hover:scale-102 cursor-pointer"
				style={{ backgroundColor: alertLevels[status].bg }}
			/>

			{/* FRONT CARD */}
			<div
				className="relative px-3 flex items-start rounded-2xl border overflow-hidden transition-all duration-150 ease-in group-hover:scale-102 cursor-pointer shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] bg-(--idle-bg) group-hover:bg-(--hover-bg)"
				style={
					{
						borderColor: alertLevels[status].bg,
						"--idle-bg": "#fffdf5",
						"--hover-bg": alertLevels[status].hoverBg,
					} as React.CSSProperties
				}>
				<div className="w-full h-20 flex items-center gap-3">
					<div className="w-15 h-15">
						<Icon
							icon="line-md:alert-twotone"
							className="w-full h-full block"
							style={{ color: alertLevels[status].bg }}
						/>
					</div>

					<div className="w-full flex flex-col text-[#817b70] text-xs capitalize">
						<div className="flex justify-between items-center text-base">
							<h3
								className="Poppins-Bold text-black lg:text-base text-sm"
								style={{ color: alertLevels[status].bg }}>
								Pestiside Spraying Alert
							</h3>

							<span
								className="Poppins-SemiBold w-18 text-xs text-center py-1 px-3 rounded-md"
								style={{
									color: alertLevels[status].bg,
									background: `${alertLevels[status].bg}4D`,
								}}>
								{status}
							</span>
						</div>

						<span className="Poppins-SemiBold">{location}</span>
						<span className="Poppins-SemiBold">
							{date} • {time}
						</span>
					</div>
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
