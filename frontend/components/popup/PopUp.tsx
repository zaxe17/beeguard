// components/popup/PopUp.tsx

"use client";

import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import { CancelButton } from "../ui/Button";
import { useEffect, useState } from "react";
import Image from "next/image";

import * as Icons from "@/public/assets/icons/icons";
import { useIsPage } from "@/hooks/useIsPage";
import { analyticsService } from "@/services/analytics";

type PopupProps = {
	onClose: () => void;
};

export const WarningQueenReplacment = ({ onClose }: PopupProps) => {
	const location = useIsPage("/beekeeper/hives");
	const [dismissed, setDismissed] = useState(false);
	// NEW: total OPEN recommendations (Replace + Monitor — "Normal" is
	// never counted here, see the backend's list_open_for_beekeeper).
	// Previously this only read `.replace`, so Monitor-level hives
	// (Weak / Needs Attention) never counted toward this warning even
	// though they DO need the beekeeper's attention.
	const [openCount, setOpenCount] = useState(0);

	useEffect(() => {
		analyticsService.dashboardSummary().then((res) => {
			if (res.success && res.data) {
				setOpenCount(res.data.recommendations.open);
			}
		});
	}, []);

	const handleClose = () => {
		setDismissed(true);
		onClose(); // still call parent's onClose if needed elsewhere
	};

	return (
		location &&
		!dismissed &&
		openCount > 0 && (
			<div className="fixed h-screen w-full bg-black/50 flex justify-center items-center">
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
						there {openCount === 1 ? "is" : "are"}{" "}
						<span>
							{openCount} {openCount === 1 ? "hive" : "hives"}
						</span>{" "}
						under queen bee replacement recommendation.
					</p>
					<CancelButton
						label="Okay"
						BGcolor="bg-transparent bg-linear-to-r from-[#ffdb4f] to-[#eec572]"
						onClick={handleClose}
					/>
				</div>
			</div>
		)
	);
};