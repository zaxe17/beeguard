import Image, { StaticImageData } from "next/image";
import React from "react";

interface ContainerProps {
	children?: React.ReactNode;
	width?: string;
	height?: string;
	borderNone?: boolean;
	scroll?: boolean;
	className?: string;
}

type BeeFarmProps = {
	image: string | StaticImageData;
	farmName?: string;
	location?: string;
	miles?: number;
};

// FORM CONTAINER
export const FormContainer = ({ children, width }: ContainerProps) => {
	return (
		<form
			action=""
			className={`${width} lg:p-4.75 bg-white/20 rounded-3xl backdrop-blur-md border border-white/30 flex flex-col min-h-0`}
			style={{
				boxShadow:
					"0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.4)",
			}}>
			<div className="p-4.75 flex-1 overflow-y-auto overflow-x-hidden min-h-0">
				{children}
			</div>
		</form>
	);
};

// FOR BOXES CONTAINER
export const Container = ({
	children,
	width,
	height,
	borderNone,
	scroll,
	className,
}: ContainerProps) => {
	return (
		<div
			className={`p-1.5 flex flex-col min-h-0 ${className ?? ""} ${borderNone ? "border-r-2 border-r-[#817b70]/50" : "rounded-2xl"} ${scroll ? "scroll-container" : ""}`}
			style={{
				boxShadow: `${borderNone ? "" : "rgba(0, 0, 0, 0.35) 0px 5px 15px"}`,
				width: width,
				height: height,
			}}>
			<div
				className={`p-1.5 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 ${scroll ? "scroll" : ""}`}>
				{children}
			</div>
		</div>
	);
};

// BEEFARM CONTAINER
export const BeefarmContainer = ({
	image,
	farmName,
	location,
	miles,
}: BeeFarmProps) => {
	return (
		<div className="p-1.5 flex flex-col rounded-2xl hover:bg-[#fff1ad]/40 transition-all duration-150 ease-in hover:scale-103 hover:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]">
			<div className="w-full flex gap-3 cursor-pointer">
				{/* BEEFARM PICTURE */}
				<div className="border border-amber-100 w-20 aspect-square rounded-lg overflow-hidden shrink-0 self-start">
					<Image
						src={image}
						alt="nearby_beekeeper"
						width={100}
						height={100}
						className="w-full h-full object-cover"
						priority
					/>
				</div>

				{/* BEEFARM NAME & LOCATION */}
				<div className="w-full flex-1 flex flex-col justify-between">
					<div>
						<h3 className="Poppins-Bold text-lg line-clamp-2">
							{farmName}
						</h3>
						<p className="text-xs text-[#a6a3a3] font-bold line-clamp-2">
							{location}
						</p>
					</div>

					<span className="text-xs text-[#a6a3a3] font-bold text-end">
						{miles} km
					</span>
				</div>
			</div>
		</div>
	);
};
