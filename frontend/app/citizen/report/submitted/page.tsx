import { Button } from "@/components/ui/Button";
import { Icon } from "@iconify/react";
import Link from "next/link";

const ReportSubmit = () => {
	return (
		<div className="w-full h-full p-5 flex items-center justify-center flex-col gap-3">
			{/* ICON */}
			<div className="w-30 h-30 border-8 border-[#00cc00]/40 rounded-full">
				<Icon
					icon="akar-icons:circle-check-fill"
					className="w-full h-full text-[#00cc00]"
				/>
			</div>

			{/* TITLE */}
			<h1 className="Poppins-Bold text-[#1f6f5f] text-6xl">
				Report Submitted!
			</h1>

			{/* SUB TITLE */}
			<p className="text-[#545454] text-base text-center leading-4 mt-5">
				Thank you! report has been sent to <br />
				nearby beekeepers.
			</p>

			{/* REPORT ID */}
			<span className="Poppins-SemiBold text-lg leading-2 mt-5">
				Report ID
			</span>
			<h3 className="bg-[#ffce1c]/40 text-3xl py-2 px-6 rounded-2xl mb-8">
				#BG-2026-001
			</h3>

			{/* BUTTON FOR VIEW REPORT */}
			<Button width="40%" label="View Reports" />
			{/* BACK HOME FOR HOME */}
			<Link href="" className="Poppins-Bold underline text-[#a6a3a3]">
				Back to Home
			</Link>
		</div>
	);
};

export default ReportSubmit;
