"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const MobileOverlay = ({ children }: { children: React.ReactNode }) => {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;

	return createPortal(
		<AnimatePresence>
			<motion.div
				initial={{ y: "100%" }}
				animate={{ y: 0 }}
				exit={{ y: "100%" }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				className="lg:hidden fixed inset-0 z-9999 bg-white h-full w-full overflow-y-auto">
				{children}
			</motion.div>
		</AnimatePresence>,
		document.body,
	);
};

export default MobileOverlay;