import Image from "next/image";
import { reportStatus, type ReportProps } from "./ui/ReportCard";

import bee from "@/public/assets/bee_example.jpg";

const ReportDetails = ({
	status,
	reportId,
	specification,
	location,
	date,
	time,
	details,
	activity,
	danger,
}: ReportProps) => {
	return (
		<div className="flex flex-col gap-4 w-full">
			{/* HIVES DETAILS */}
			<div
				className="border-2 border-[#e2e2e6] rounded-2xl p-2.5 capitalize flex gap-5"
				style={{
					boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
				}}>
				{/* LEFT */}
				<div className="w-full h-full overflow-hidden">
					<Image
						src={bee}
						alt="hive_icon"
						className="w-full h-full object-cover rounded-md"
						priority
					/>
				</div>

				{/* RIGHT */}
				<div className="w-full">
					{/* REPORT ID */}
					<div className="flex justify-between items-start">
						<h2 className="Poppins-SemiBold text-lg text-[#545454]">
							Report ID
						</h2>
						<span
							className="Poppins-SemiBold text-xs text-center capitalize w-22 py-0.75 rounded-full"
							style={{
								color: reportStatus[status].color,
								backgroundColor: `${reportStatus[status].color}66`,
							}}>
							{status}
						</span>
					</div>

					{/* REPORT ID */}
					<h3 className="Poppins-SemiBold text-2xl text-[#ffce1c]">
						#{reportId}
					</h3>

					{/* BEE NAME */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Bee Specification
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{specification}
					</p>

					{/* LOCATION */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Location
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{location}
					</p>

					{/* DATE AND TIME */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Date & Time
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{date} • {time}
					</p>

					{/* DETAILS */}
					<h2 className="Poppins-SemiBold leading-3.5 mt-3 text-sm text-[#817b70]">
						Details
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						{details}
					</p>

					{/* ACTIVITY AND DANGER */}
					<div className="flex gap-8 items-center mt-3">
						<div>
							<h2 className="Poppins-SemiBold leading-3.5 text-sm text-[#817b70]">
								Activity
							</h2>
							<p className="leading-4 text-[#4A2F00] font-medium">
								{activity}
							</p>
						</div>
						<div>
							<h2 className="Poppins-SemiBold leading-3.5 text-sm text-[#817b70]">
								Danger
							</h2>
							<p className="leading-4 text-[#4A2F00] font-medium">
								{danger}
							</p>
						</div>
					</div>

					{/* PAYMENT METHOD */}
					<h2 className="Poppins-SemiBold leading-2 mt-3 text-sm text-[#817b70]">
						Payment Method
					</h2>
					<p className="leading-4 text-[#4A2F00] font-medium">
						Cash Upon Rescue
					</p>
				</div>
			</div>

			{/* BUTTONS */}
			<div className="flex flex-col items-center justify-center gap-5"></div>
		</div>
	);
};

export default ReportDetails;
