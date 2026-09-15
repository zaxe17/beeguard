import { useId, useState } from "react";

type SwitchProps = {
	checked?: boolean;
	onChange?: (checked: boolean) => void;
	disabled?: boolean;
	label?: string;
	labelPosition?: "left" | "right";
	size?: "sm" | "md" | "lg";
	name?: string;
};

/**
 * Switch — an accessible toggle control.
 *
 * Props
 * ------------------------------------------------------------------
 * checked        boolean            current on/off state (controlled)
 * onChange       (checked:boolean)  fired with the new value on toggle
 * disabled       boolean            disables interaction, dims the control
 * label          string             optional text shown next to the switch
 * labelPosition  "left" | "right"   which side the label sits on (default "right")
 * size           "sm" | "md" | "lg" visual scale (default "md")
 * name           string             optional form field name
 * ------------------------------------------------------------------
 */
export const Switch = ({
	checked = false,
	onChange = () => {},
	disabled = false,
	label,
	labelPosition = "right",
	size = "md",
	name,
}: SwitchProps) => {
	const id = useId();

	const dims = {
		sm: {
			track: "w-8 h-5",
			thumb: "w-3.5 h-3.5",
			translate: "translate-x-3",
			text: "text-sm",
		},
		md: {
			track: "w-11 h-6",
			thumb: "w-4.5 h-4.5",
			translate: "translate-x-5",
			text: "text-base",
		},
		lg: {
			track: "w-14 h-7",
			thumb: "w-5.5 h-5.5",
			translate: "translate-x-7",
			text: "text-lg",
		},
	}[size];

	const toggle = () => {
		if (disabled) return;
		onChange(!checked);
	};

	const control = (
		<button
			id={id}
			type="button"
			role="switch"
			name={name}
			aria-checked={checked}
			disabled={disabled}
			onClick={toggle}
			className={[
				dims.track,
				"relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500",
				checked ? "bg-emerald-500" : "bg-neutral-300",
				disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
			].join(" ")}>
			<span
				className={[
					dims.thumb,
					"pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out",
					checked ? dims.translate : "translate-x-0.5",
				].join(" ")}
			/>
		</button>
	);

	if (!label) return control;

	return (
		<label
			htmlFor={id}
			className={[
				"inline-flex items-center gap-2 select-none",
				dims.text,
				disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
			].join(" ")}>
			{labelPosition === "left" && <span>{label}</span>}
			{control}
			{labelPosition === "right" && <span>{label}</span>}
		</label>
	);
};
