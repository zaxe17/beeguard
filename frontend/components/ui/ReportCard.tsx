import Image from "next/image";

import bee from "@/public/assets/bee_example.jpg";

export type ReportProps = {
	status: "pending" | "progress" | "resolved" | "rejected";
    reportId?: string;
	beeName?: string;
	specification?: string;
	location?: string;
	date?: string;
	time?: string;
	details?: string;
	activity?: string;
	danger?: string;
};

export const reportStatus = {
	pending: {
		color: "#ffdb4f",
	},
	progress: {
		color: "#ff9a00",
	},
	resolved: {
		color: "#1f6f5f",
	},
	rejected: {
		color: "#ff0000",
	},
};

export const ReportCard = ({ status }: ReportProps) => {
	return (
		<div className="border border-transparent transition-all duration-150 ease-in hover:border-[#e2e2e6] hover:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] hover:bg-[#fff1ad]/40 hover:scale-103 rounded-xl p-1.75 flex items-center gap-3">
			{/* BEE PICTURE */}
			<div className="border border-amber-100 w-30 h-full rounded-md overflow-hidden">
				<Image
					src={bee}
					alt="bee"
					width={100}
					className="w-full h-full object-cover"
					priority
				/>
			</div>

			{/* CONTAINER FOR INFO */}
			<div className="w-full h-full flex flex-col jus">
				<div className="flex justify-between items-start">
					<h3 className="Poppins-Bold text-xl">#BG-2026-001</h3>
					<span
						className="Poppins-SemiBold text-xs text-center capitalize w-22 py-0.75 rounded-full"
						style={{
							color: reportStatus[status].color,
							backgroundColor: `${reportStatus[status].color}66`,
						}}>
						{status}
					</span>
				</div>
				<span className="Poppins-SemiBold text-sm">
					Payatas, Quezon City
				</span>
				<span className="Poppins-SemiBold text-xs text-[#a6a3a3]">
					March 29, 2026 • 9:41 am
				</span>
			</div>
		</div>
	);
};

