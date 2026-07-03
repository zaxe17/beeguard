import { Icon } from "@iconify/react";
import { ReactNode } from "react";

type InputProps = {
	name?: string;
	id?: string;
	label?: ReactNode;
	placeholder?: string;
	value?: string;
	width?: number;
	height?: number;
	options?: { label: string; value: string }[];
};

export const Input = ({
	name,
	id,
	label,
	placeholder,
	width,
	height,
}: InputProps) => {
	return (
		<div className="flex flex-col w-full">
			<label htmlFor="" className="text-base">
				{label}
			</label>
			<input
				type="text"
				name={name}
				id={id}
				placeholder={placeholder}
				className="text-sm w-full h-10 p-2.5 border-2 border-[#a6a3a3] outline-0 rounded-lg bg-white/70"
				style={{ width: `${width}px`, height: `${height}px` }}
			/>
		</div>
	);
};

export const Select = ({ name, label, options, width, height }: InputProps) => {
	return (
		<div className="flex flex-col w-full">
			<label htmlFor="" className="text-base">
				{label}
			</label>
			<select
				name={name}
				id=""
				className="w-full h-10 border-2 border-[#a6a3a3] outline-0 rounded-lg bg-white/70"
				style={{ width: `${width}px`, height: `${height}px` }}>
				<option value="">Please select</option>

				{options
					?.filter(
						(opt, index, self) =>
							index ===
							self.findIndex((o) => o.label === opt.label),
					)
					.slice()
					.sort((a, b) => a.label.localeCompare(b.label))
					.map((opt) => (
						<option key={opt.value} value={opt.label}>
							{opt.label}
						</option>
					))}
			</select>
		</div>
	);
};

export const CheckBox = ({ label }: InputProps) => {
	return (
		<div className="flex items-center gap-2">
			<label className="checkbox">
				<input type="checkbox" />
				<span></span>
			</label>
			<label htmlFor="" className="text-lg">
				{label}
			</label>
		</div>
	);
};

// SEARCHBAR
export const SearchBar = ({ placeholder }: InputProps) => {
	return (
		<div className="w-full flex items-center bg-[#d9d9d9] py-1.5 px-2 rounded-2xl">
			<Icon icon="mdi:search" className="w-5 h-5 text-[#494949]" />
			<input
				type="text"
				className="w-full px-1.5 text-sm bg-transparent outline-0"
				placeholder={placeholder}
			/>
		</div>
	);
};
