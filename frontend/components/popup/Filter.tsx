"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

export type FilterOption = {
	label: string;
	// What onChange gets when this option is picked. Defaults to `label`.
	value?: string;
};

type FilterContentProps = {
	label?: FilterOption[];
	// NEW — the picked option's value (shows a check mark next to it).
	value?: string;
	// NEW — called with the option's value when one is picked.
	onChange?: (value: string) => void;
	// NEW — small heading at the top of the dropdown, e.g. "Risk level".
	title?: string;
};

export const FilterContainer = ({
	label = [],
	value,
	onChange,
	title,
}: FilterContentProps) => {
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

	const optionValue = (f: FilterOption) => f.value ?? f.label;
	// The icon turns yellow while a filter other than the first ("All") is on.
	const isFiltering =
		value !== undefined && label.length > 0 && value !== optionValue(label[0]);

	return (
		<div className="relative" ref={containerRef}>
			<div
				className="w-10 h-10 cursor-pointer relative"
				onClick={() => setIsOpen((prev) => !prev)}>
				<Icon
					icon="mdi:filter-variant"
					className={`w-full h-full ${isFiltering ? "text-[#ffce1c]" : "text-[#817b70]"}`}
				/>
				{isFiltering && (
					<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff9a00]" />
				)}
			</div>

			{isOpen && (
				<div className="absolute z-1000 translate-y-1 right-0 w-50 bg-[#fffdf5] shadow-[0px_1px_2px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.07),0px_4px_8px_rgba(0,0,0,0.07),0px_8px_16px_rgba(0,0,0,0.07),0px_16px_32px_rgba(0,0,0,0.07),0px_32px_64px_rgba(0,0,0,0.07)] rounded-lg py-2 px-1">
					{title && (
						<p className="Poppins-SemiBold text-xs text-[#a6a3a3] px-1 pb-1">
							{title}
						</p>
					)}
					{label.map((f) => {
						const v = optionValue(f);
						const selected = value !== undefined && value === v;
						return (
							<div
								key={v}
								role="button"
								tabIndex={0}
								onClick={() => {
									onChange?.(v);
									setIsOpen(false);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onChange?.(v);
										setIsOpen(false);
									}
								}}
								className={`flex items-center justify-between gap-2 w-full py-1 px-1 cursor-pointer transition-all duration-105 ease-in-out hover:bg-[#fff4c7] rounded-sm ${
									selected ? "bg-[#fff4c7]" : ""
								}`}>
								<span className="text-base font-medium">{f.label}</span>
								{selected && (
									<Icon icon="mdi:check" className="w-4 h-4 text-[#ff9a00] shrink-0" />
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};