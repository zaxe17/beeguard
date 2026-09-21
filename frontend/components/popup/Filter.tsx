"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

type FilterOption = {
	label: string;
};

type FilterContentProps = {
	label?: FilterOption[];
};

export const FilterContainer = ({ label = [] }: FilterContentProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// close on click-outside
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div className="relative" ref={containerRef}>
			<div
				className="w-10 h-10 cursor-pointer"
				onClick={() => setIsOpen((prev) => !prev)}>
				<Icon
					icon="mdi:filter-variant"
					className="w-full h-full text-[#817b70]"
				/>
			</div>

			{isOpen && (
				<div className="absolute z-1000 translate-y-1 right-0 w-50 bg-[#fffdf5] shadow-[0px_1px_2px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.07),0px_4px_8px_rgba(0,0,0,0.07),0px_8px_16px_rgba(0,0,0,0.07),0px_16px_32px_rgba(0,0,0,0.07),0px_32px_64px_rgba(0,0,0,0.07)] rounded-lg py-2 px-1">
					{label.map((f) => (
						<div
							key={f.label}
							className="flex items-center gap-2 w-full py-1 px-1 cursor-pointer transition-all duration-105 ease-in-out hover:bg-[#fff4c7] rounded-sm">
							<label className="text-base font-medium cursor-pointer">
								{f.label}
							</label>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
