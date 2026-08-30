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
			<span className="Poppins-SemiBold text-xs text-[#a6a3a3]">{title}</span>
		</div>
	);
};
