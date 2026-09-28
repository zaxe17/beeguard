"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";

// Must match LIVE_DURATIONS_MINUTES in backend validators/chat_validator.py.
const LIVE_OPTIONS = [
	{ minutes: 15, label: "15 min" },
	{ minutes: 60, label: "1 hour" },
	{ minutes: 480, label: "8 hours" },
];

type LocationShareModalProps = {
	open: boolean;
	busy: boolean;
	error: string | null;
	onClose: () => void;
	// 0 = one-time pin, otherwise live for that many minutes.
	onShare: (liveMinutes: number) => void;
};

export const LocationShareModal = ({
	open,
	busy,
	error,
	onClose,
	onShare,
}: LocationShareModalProps) => {
	return (
		<AnimatePresence>
			{open && (
				<motion.div
					className="fixed inset-0 z-10001 flex lg:items-center items-end justify-center bg-black/40"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={busy ? undefined : onClose}>
					<motion.div
						onClick={(e) => e.stopPropagation()}
						initial={{ y: 40, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 40, opacity: 0 }}
						transition={{ type: "spring", stiffness: 350, damping: 30 }}
						className="bg-white w-full lg:w-96 lg:rounded-2xl rounded-t-2xl p-5 shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]">
						{/* HEADER */}
						<div className="flex items-center gap-2 mb-1">
							<div className="w-8 h-8 rounded-full bg-[#ffdb4f] flex items-center justify-center">
								<Icon icon="mdi:map-marker-radius" className="w-5 h-5 text-[#4a2f00]" />
							</div>
							<h3 className="Poppins-SemiBold text-base text-[#020101]">
								Share your location
							</h3>
						</div>
						<p className="text-xs text-[#817b70] mb-4">
							The other person will see where you are on a map.
						</p>

						{/* LIVE LOCATION */}
						<div className="rounded-xl bg-[#fff8d6] p-3">
							<div className="flex items-center gap-1.5">
								<Icon icon="mdi:crosshairs-gps" className="w-4 h-4 text-[#ffa004]" />
								<span className="Poppins-SemiBold text-sm">Share live location</span>
							</div>
							<p className="text-[11px] text-[#817b70] mt-0.5 mb-2">
								Your pin moves as you move. It keeps updating while this
								conversation is open on your device.
							</p>
							<div className="grid grid-cols-3 gap-2">
								{LIVE_OPTIONS.map((opt) => (
									<button
										key={opt.minutes}
										disabled={busy}
										onClick={() => onShare(opt.minutes)}
										className="text-xs Poppins-Medium rounded-full py-2 bg-[#ffdb4f] hover:bg-[#ffc95f] disabled:opacity-50 transition-all duration-130 ease-in">
										{opt.label}
									</button>
								))}
							</div>
						</div>

						{/* ONE-TIME */}
						<button
							disabled={busy}
							onClick={() => onShare(0)}
							className="w-full mt-3 flex items-center gap-2 rounded-xl p-3 text-left hover:bg-[#fff1ad]/60 disabled:opacity-50 transition-all duration-130 ease-in">
							<Icon icon="mdi:map-marker" className="w-5 h-5 text-[#4a2f00] shrink-0" />
							<div className="flex flex-col">
								<span className="Poppins-SemiBold text-sm">Send current location</span>
								<span className="text-[11px] text-[#817b70]">
									A one-time pin of where you are right now.
								</span>
							</div>
						</button>

						{busy && (
							<p className="text-xs text-[#817b70] mt-3 text-center">
								Getting your location…
							</p>
						)}
						{error && (
							<p className="text-xs text-red-600 mt-3 text-center">{error}</p>
						)}

						<button
							disabled={busy}
							onClick={onClose}
							className="w-full mt-4 text-sm Poppins-Medium rounded-full py-2 bg-[#d9d9d9] hover:bg-[#cfcfcf] disabled:opacity-50 transition-all duration-130 ease-in">
							Cancel
						</button>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};