import Image, { StaticImageData } from "next/image";
import React from "react";

interface ContainerProps {
	children?: React.ReactNode;
	width?: string;
	height?: string;
	borderNone?: boolean;
	scroll?: boolean;
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
			className="p-4.75 bg-[#fbf9ee]/60 rounded-3xl backdrop-blur-xs flex flex-col min-h-0"
			style={{
				boxShadow: "rgba(0, 0, 0, 0.35) 0px 5px 15px",
				width: width,
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
}: ContainerProps) => {
	return (
		<div
			className={`p-1.5 flex flex-col min-h-0 ${borderNone ? "" : "rounded-2xl"} ${scroll ? "scroll-container" : ""}`}
			style={{
				boxShadow: `rgba(50, 50, 93, 0.25) ${borderNone ? "2px" : "0px"} 2px 5px -1px, rgba(0, 0, 0, 0.3) ${borderNone ? "2px" : "0px"} 1px 3px -1px`,
				width: width,
				height: height,
			}}>
			<div
				className={`p-1.5 flex-1 flex flex-col gap-5 overflow-y-auto overflow-x-hidden min-h-0 ${scroll ? "scroll" : ""}`}>
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
		<Container>
			<div className="w-full flex gap-3 cursor-pointer">
				{/* BEEFARM PICTURE */}
				<div className="bg-red-600 border border-amber-100 w-20 aspect-square rounded-lg overflow-hidden shrink-0 self-start">
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
		</Container>
	);
};
