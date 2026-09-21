"use client";

import { ProfilePhoto } from "@/components/ProfilePhoto";
import { Button, CancelButton } from "@/components/ui/Button";
import { Icon } from "@iconify/react";
import { StarRating } from "./ui/StarRating";
import { useState } from "react";

type ButtonVariant = "respond" | "message" | "resolved";

interface ButtonsProps {
	button?: ButtonVariant;
	onAccept?: () => void;
	onReject?: () => void;
	onMessage?: () => void;
	onSubmitRating?: (rating: number) => void;
}

const BUTTON_CONFIG: Record<ButtonVariant, React.FC<ButtonsProps>> = {
	respond: ({ onAccept, onReject }) => (
		<>
			<CancelButton
				BGcolor="bg-[#e2e2e6]"
				label="Reject"
				onClick={onReject}
				width="lg:w-30 w-full"
			/>
			<Button label="Accept" onClick={onAccept} width="lg:w-30 w-full" />
		</>
	),
	message: ({ onMessage }) => (
		<>
			<CancelButton
				BGcolor="bg-[#e2e2e6]"
				textColor="#ff3131"
				width="150px"
				label="Cancel Report"
			/>
			<Button label="Message" onClick={onMessage} width="150px" />
		</>
	),
	resolved: () => null, // handled separately below (needs rating state)
};

export const Beekeeper = ({ button, ...handlers }: ButtonsProps) => {
	const [rating, setRating] = useState(0);

	if (!button) return null;

	const isResolved = button === "resolved";
	const Variant = BUTTON_CONFIG[button];

	return (
		<div
			className={`w-full flex lg:flex-row flex-col items-center gap-3 p-2 transition-all duration-130 ease-in hover:bg-[#fff1ad]/40 rounded-xl ${button === "message" ? "bg-[#fff1ad]/40 shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]" : "hover:bg-[#fff1ad]/40"}`}>
			<div className="flex items-center justify-start w-full gap-2">
				{/* PROFILE */}
				<div className="w-15 h-15">
					<ProfilePhoto />
				</div>

				{/* NAME AND OFFER */}
				<div className="">
					<h3 className="Poppins-SemiBold text-base">
						John Evans Gutierrez
					</h3>
					<span className="text-sm text-[#a6a3a3]">
						Offer: <span className="text-[#ff9a00]">PHP 5,000</span>
					</span>

					{/* ONLY SHOW RATING WHEN RESOLVED */}
					{isResolved && (
						<StarRating value={rating} onChange={setRating} />
					)}
				</div>
			</div>

			{/* RIGHT SIDE BUTTONS */}
			<div className="lg:w-auto w-full ml-auto flex gap-2">
				{isResolved ? (
					<Button
						label="Submit"
						onClick={() => handlers.onSubmitRating?.(rating)}
						width="lg:w-30 w-full"
					/>
				) : (
					<Variant {...handlers} />
				)}
			</div>
		</div>
	);
};
