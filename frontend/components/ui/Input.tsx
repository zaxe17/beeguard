"use client";

import { Icon } from "@iconify/react";
import { ChangeEvent, ReactNode, useState } from "react";

type InputProps = {
	name?: string;
	id?: string;
	label?: ReactNode;
	placeholder?: string;
	value?: string;
	width?: number;
	height?: number;
	options?: { label: string; value: string }[];
	type?: string;
	onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	error?: boolean;
	capitalize?: boolean;
	disabled?: boolean; // NEW
};

type SelectProps = InputProps & {
	onSelectChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
};

type RangeInputProps = {
	label?: string;
	min?: number;
	max?: number;
	unit?: string;
};

const capitalizeWords = (value: string) =>
	value.replace(/\b\w/g, (char) => char.toUpperCase());

export const Input = ({
	name,
	id,
	label,
	placeholder,
	width,
	height,
	value,
	onChange,
	type,
	error,
	capitalize,
	disabled, // NEW
}: InputProps) => {
	return (
		<div className="flex flex-col w-full">
			<label
				htmlFor=""
				className={`lg:text-base text-xs ${
					error ? "text-red-600" : "text-black"
				}`}>
				{label}
			</label>
			<input
				type={type || "text"}
				name={name}
				id={id}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				disabled={disabled}
				onInput={(e) => {
					if (capitalize) {
						e.currentTarget.value = capitalizeWords(
							e.currentTarget.value,
						);
					}
				}}
				className={`text-sm w-full h-10 p-2.5 border ${
					error ? "border-red-600" : "border-[#a6a3a3]"
				} outline-0 rounded-lg bg-white/70 ${
					disabled ? "opacity-60 cursor-not-allowed" : ""
				} [appearance:textfield]
    				[&::-webkit-outer-spin-button]:appearance-none
   					[&::-webkit-inner-spin-button]:appearance-none`}
				style={{ width: `${width}px`, height: `${height}px` }}
			/>
		</div>
	);
};

export const Select = ({
	name,
	label,
	options,
	width,
	height,
	value,
	onSelectChange,
	error,
	disabled, // NEW
}: SelectProps) => {
	return (
		<div className="flex flex-col w-full">
			<label
				htmlFor=""
				className={`lg:text-base text-xs ${
					error ? "text-red-600" : "text-black"
				}`}>
				{label}
			</label>
			<select
				name={name}
				id=""
				value={value}
				onChange={onSelectChange}
				disabled={disabled}
				className={`w-full h-10 border ${
					error ? "border-red-600" : "border-[#a6a3a3]"
				} outline-0 rounded-lg bg-white/70 lg:text-base text-xs ${
					disabled ? "opacity-60 cursor-not-allowed" : ""
				}`}
				style={{ width: `${width}px`, height: `${height}px` }}>
				<option value=""></option>

				{options
					?.filter(
						(opt, index, self) =>
							index ===
							self.findIndex((o) => o.value === opt.value),
					)
					.slice()
					.sort((a, b) => a.label.localeCompare(b.label))
					.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
			</select>
		</div>
	);
};

export const CheckBox = ({
	label,
	checked,
	onCheckedChange,
	name,
}: InputProps) => {
	return (
		<div className="flex items-center gap-2">
			<label className="checkbox">
				<input
					type="checkbox"
					name={name}
					checked={checked}
					onChange={(e) => onCheckedChange?.(e.target.checked)}
				/>
				<span></span>
			</label>
			<label htmlFor="" className="lg:text-lg text-sm">
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

export const RangeInput = ({
	label,
	min = 0,
	max = 5,
	unit = "km",
}: RangeInputProps) => {
	const [value, setValue] = useState(min);

	const percentage = ((value - min) / (max - min)) * 100;
	const midValue = Math.round((min + max) / 2);

	return (
		<div className="w-full flex flex-col gap-2">
			{label && (
				<div className="flex items-center text-sm text-[#0F172A]">
					<p className="Poppins-SemiBold font-medium">{label}</p>
					<p className="ml-auto font-bold">
						{value} {unit}
					</p>
				</div>
			)}

			<input
				type="range"
				min={min}
				max={max}
				step="1"
				value={value}
				onChange={(e) => setValue(Number(e.target.value))}
				className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ffce1c] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#ffce1c] [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-md"
				style={{
					background: `linear-gradient(to right, #ffce1c 0%, #ffce1c ${percentage}%, #d1d1d1 ${percentage}%, #d1d1d1 100%)`,
				}}
			/>

			{/* TICK LABELS */}
			<div className="w-full flex justify-between text-xs text-[#817b70]">
				<span>
					{min} {unit}
				</span>
				<span>
					{midValue} {unit}
				</span>
				<span>
					{max} {unit}
				</span>
			</div>
		</div>
	);
};