"use client";

import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import { CancelButton } from "../ui/Button";
import { useState } from "react";
import Image from "next/image";

import * as Icons from "@/public/assets/icons/icons";
import { useIsPage } from "@/hooks/useIsPage";

type PopupProps = {
	onClose: () => void;
};

export const WarningQueenReplacment = ({ onClose }: PopupProps) => {
	const location = useIsPage("/beekeeper/hives");
	const [dismissed, setDismissed] = useState(false);

	const handleClose = () => {
		setDismissed(true);
		onClose(); // still call parent's onClose if needed elsewhere
	};

	return (
		location &&
		!dismissed && (
			<div className="hidden fixed h-screen w-full bg-black/50 flex justify-center items-center">
				<div className="w-1/4 min-w-[320px] bg-[#fefefd] rounded-3xl border-2 border-[#a6a3a3] border-solid p-5 flex flex-col justify-center items-center text-center">
					<h1 className="Poppins-Bold text-4xl">Warning</h1>
					<div className="rounded-full w-30 h-30">
						<Image
							src={Icons.alert}
							alt=""
							className="w-full h-full object-contain"
							priority
						/>
					</div>
					<p className="uppercase mb-3">
						there are <span>3 hives</span> under queen bee
						replacement recommendation.
					</p>
					<CancelButton
						label="Okay"
						BGcolor="bg-linear-to-r from-[#ffdb4f] to-[#eec572]"
						onClick={handleClose}
					/>
				</div>
			</div>
		)
	);
};
