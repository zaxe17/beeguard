import { Icon } from "@iconify/react";
import Image, { StaticImageData } from "next/image";

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
	month?: string;
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

export const TotalStatusCard = ({ icon, count, title, color, month }: TotalProps) => {
	return (
		<div
			className="w-full border border-[#a6a3a3] rounded-2xl p-3 flex gap-3 h-25"
			style={{ boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px" }}>
			{/* ICON */}
			<div
				className="rounded-lg aspect-square p-3"
				style={{ backgroundColor: `${color}4D` }}>
				<Icon
					icon={icon}
					className="w-full h-full"
					style={{ color: color }}
				/>
			</div>

			<div className="flex flex-col">
				{/* CARD TITLE */}
				<span
					className={`Poppins-SemiBold text-xl`}
					style={{ color: color }}>
					{title}
				</span>

				{/* TOTAL COUNT */}
				<span className="Poppins-SemiBold capitalize text-xl">
					{count}
				</span>

				{/* PERCENT OF THIS MONTH */}
				<span className="Poppins-SemiBold capitalize text-sm text-[#00cc00] flex items-center gap-1">
					<div className="">
						<Icon
							icon="akar-icons:triangle-up-fill"
							className="w-full h-full"
						/>
					</div>
					8% this month
				</span>
			</div>
		</div>
	);
};
