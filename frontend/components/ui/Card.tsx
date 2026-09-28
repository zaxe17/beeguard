import { Icon } from "@iconify/react";
import Image, { StaticImageData } from "next/image";
import type { AdminStatChange } from "@/services/admin";

type CardProps = {
	icon: string | StaticImageData;
	count?: string;
	title?: string;
	color?: string;
};

type RateProps = {
	total?: string;
	title?: string;
};

type TotalProps = {
	icon: string;
	count?: string;
	title?: string;
	color?: string;
	total?: string;
	// Custom text for the bottom line (overrides `change`).
	month?: string;
	// Real month-over-month change from the backend.
	change?: AdminStatChange | null;
	// Active Alerts: going up is bad, so up = red and down = green.
	upIsBad?: boolean;
};

export const Card = ({ icon, count, title, color }: CardProps) => {
	return (
		<div
			className="w-full border border-[#a6a3a3] rounded-2xl py-4 flex flex-col items-center justify-between"
			style={{ boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px" }}>
			{/* ICON */}
			<div
				className="rounded-full w-15 h-15 p-3"
				style={{ backgroundColor: `${color}4D` }}>
				<Image
					src={icon}
					alt=""
					className="w-full h-full object-contain"
					priority
				/>
			</div>

			{/* STATUS COUNT */}
			<span
				className={`Poppins-SemiBold text-xl`}
				style={{ color: color }}>
				{count}
			</span>

			{/* STATUS TITLE */}
			<span className="Poppins-SemiBold capitalize text-sm text-center">
				{title}
			</span>
		</div>
	);
};

export const RateCard = ({ total, title }: RateProps) => {
	return (
		<div className="w-full border border-[#e2e2e6] rounded-full p-2 flex flex-col items-center">
			{/* TOTAL */}
			<span className="Poppins-Bold text-base">{total}</span>
			{/* TITLE */}
			<span className="Poppins-SemiBold text-xs text-[#a6a3a3]">
				{title}
			</span>
		</div>
	);
};

const GREEN = "#00cc00";
const RED = "#ff0000";
const GRAY = "#a6a3a3";

// Turns the backend numbers into the arrow, color and text.
const describeChange = (change: AdminStatChange, upIsBad: boolean) => {
	const { direction, percent, this_month, last_month } = change;

	if (direction === "same") {
		return {
			icon: null,
			color: GRAY,
			text: this_month === 0 ? "none this month" : "0% this month",
		};
	}

	const good = direction === "up" ? !upIsBad : upIsBad;
	const color = good ? GREEN : RED;
	const icon =
		direction === "up"
			? "akar-icons:triangle-up-fill"
			: "akar-icons:triangle-down-fill";

	// Last month was 0 → a percentage makes no sense, show the count.
	const text =
		last_month === 0 || percent === null
			? `+${this_month} new this month`
			: `${percent}% this month`;

	return { icon, color, text };
};

export const TotalStatusCard = ({
	icon,
	count,
	title,
	color,
	month,
	change,
	upIsBad = false,
}: TotalProps) => {
	const info = change ? describeChange(change, upIsBad) : null;
	const tooltip = change
		? `This month: ${change.this_month} • Last month (same days): ${change.last_month}`
		: undefined;

	return (
		<div
			className="w-full border border-[#a6a3a3] rounded-2xl p-3 flex justify-center items-center lg:flex-row flex-col gap-3 lg:h-25"
			style={{ boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px" }}>
			{/* ICON */}
			<div
				className="rounded-lg w-20 aspect-square p-3"
				style={{ backgroundColor: `${color}4D` }}>
				<Icon
					icon={icon}
					className="w-full h-full"
					style={{ color: color }}
				/>
			</div>

			<div className="w-full flex flex-col">
				{/* CARD TITLE */}
				<span
					className="Poppins-SemiBold lg:text-xl text-sm"
					style={{ color: color }}>
					{title}
				</span>

				{/* TOTAL COUNT */}
				<span className="Poppins-SemiBold capitalize lg:text-xl text-base">
					{count}
				</span>

				{/* PERCENT OF THIS MONTH */}
				{month ? (
					<span className="Poppins-SemiBold capitalize text-xs text-[#00cc00] flex items-center gap-1">
						{month}
					</span>
				) : info ? (
					<span
						title={tooltip}
						className="Poppins-SemiBold capitalize text-xs flex items-center gap-1"
						style={{ color: info.color }}>
						{info.icon && (
							<span className="inline-flex">
								<Icon icon={info.icon} className="w-full h-full" />
							</span>
						)}
						{info.text}
					</span>
				) : (
					// Loading — keeps the card the same height.
					<span className="Poppins-SemiBold text-xs text-[#a6a3a3]">…</span>
				)}
			</div>
		</div>
	);
};