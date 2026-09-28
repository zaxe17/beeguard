// components/ui/VerifyStatus.tsx
import React from "react";

// Badge for a beekeeper's verification status. With no `status` it
// shows "Verified Beekeeper" exactly like before, so existing usage
// (e.g. BeefarmView) is unchanged.
type VerifyStatusProps = {
	status?: "Verified" | "Pending" | "Rejected" | "Unverified" | string | null;
};

const STYLES: Record<string, { label: string; className: string }> = {
	Verified: {
		label: "Verified Beekeeper",
		className: "bg-[#8ac44f]/20 text-[#00cc00]",
	},
	Pending: {
		label: "Verification Pending",
		className: "bg-[#ffdb4f]/30 text-[#b97a00]",
	},
	Rejected: {
		label: "Verification Rejected",
		className: "bg-red-600/15 text-red-600",
	},
	Unverified: {
		label: "Not Verified",
		className: "bg-[#e2e2e6] text-[#817b70]",
	},
};

export const VerifyStatus = ({ status = "Verified" }: VerifyStatusProps) => {
	const style = STYLES[status ?? "Unverified"] ?? STYLES.Unverified;
	return (
		<div
			className={`Poppins-Bold w-fit text-xs py-0.75 px-2 rounded-full flex items-center gap-1 ${style.className}`}>
			{/* check mark for verified beekeepers */}
			{(status ?? "Unverified") === "Verified" && (
				<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
					<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
				</svg>
			)}
			{style.label}
		</div>
	);
};