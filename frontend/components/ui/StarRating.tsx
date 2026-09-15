"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

type StarRatingProps = {
	value?: number;
	onChange?: (rating: number) => void;
	max?: number;
};

export const StarRating = ({
	value = 0,
	onChange,
	max = 5,
}: StarRatingProps) => {
	return (
		<div className="flex items-center">
			{Array.from({ length: max }, (_, i) => {
				const starValue = i + 1;
				const isFilled = starValue <= value;

				return (
					<div
						key={starValue}
						className="w-6 h-6 cursor-pointer"
						onClick={() => onChange?.(starValue)}>
						<Icon
							icon={
								isFilled
									? "material-symbols:star-rounded"
									: "material-symbols:star-outline-rounded"
							}
							className="w-full h-full text-[#fbca42]"
						/>
					</div>
				);
			})}
		</div>
	);
};
