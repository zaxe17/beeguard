import { Icon } from "@iconify/react";
import { AlertContainer } from "@/components/ui/Alert";

type DetailsProps = {
	location?: string;
	date?: string;
	time?: string;
	desc?: string;
	status: "high" | "medium" | "low";
};

type InformationProps = {
	pesTyp?: string;
	method?: string;
	date?: string;
	time?: string;
	radius?: string;
	issued?: string;
	contact?: string;
};

const alertLevels = {
	high: {
		text: "#e63946",
		bg: "#ff0000",
	},
	medium: {
		text: "#f77f00",
		bg: "#ff9a00",
	},
	low: {
		text: "#2d9d5f",
		bg: "#00cc00",
	},
};

// ALERT DETAILS
const Details = ({ location, date, time, desc, status }: DetailsProps) => {
	return (
		<AlertContainer title="Alert Details">
			<div className="w-full h-full flex items-center gap-4">
				<div className="w-15 h-15">
					<Icon
						icon="line-md:alert-twotone"
						className="w-full h-full block"
						style={{
							color: alertLevels[status].text,
						}}
					/>
				</div>

				{/* ALERT DETAILS */}
				<div className="w-full flex flex-col text-[#817b70] text-xs capitalize">
					<div className="flex justify-between items-center text-base">
						<h3
							className="Poppins-SemiBold text-sm text-black"
							style={{}}>
							Pestiside Spraying Alert
						</h3>

						{/* ALERT STATUS */}
						<span
							className="Poppins-SemiBold w-18 text-[10px] text-center py-1 px-3 rounded-md"
							style={{
								color: alertLevels[status].text,
								backgroundColor: `${alertLevels[status].text}4D`,
							}}>
							{status}
						</span>
					</div>

					{/* LOCATION */}
					<span className="Poppins-SemiBold">{location}</span>
					{/* DATE & TIME */}
					<span className="Poppins-SemiBold mb-7">
						{date} • {time}
					</span>
					{/*  */}
					<p className="w-1/2">{desc}</p>
				</div>
			</div>
		</AlertContainer>
	);
};

// ALERT INFORMATION
const Information = ({
	pesTyp,
	method,
	date,
	time,
	radius,
	issued,
	contact,
}: InformationProps) => {
	return (
		<AlertContainer title="Alert Information">
			<div className="w-full flex flex-col gap-3 text-sm">
				<div className="flex justify-between items-center">
					<span className="">Pesticide Type</span>
					<span className="Poppins-SemiBold">{pesTyp}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Application Method</span>
					<span className="Poppins-SemiBold">{method}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Scheduled Date</span>
					<span className="Poppins-SemiBold">
						{date} • {time}
					</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Danger Radius</span>
					<span className="Poppins-SemiBold">{radius}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Issued By</span>
					<span className="Poppins-SemiBold">{issued}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Contact</span>
					<span className="Poppins-SemiBold">{contact}</span>
				</div>
			</div>
		</AlertContainer>
	);
};

const AlertDetails = () => {
	return (
		<div className="h-screen w-full flex gap-15 py-15 px-20">
			{/* LEFT */}
			<div className="w-1/2 capitalize flex flex-col gap-8">
				<Details
					location="Atok, Benguet"
					date="May 16, 2026"
					time="8:00 AM"
					desc="Pesticide spraying activity detected in your area."
					status="high"
				/>

				<Information
					pesTyp="Cypermethrin"
					method="Aeral Spray"
					date="May 16, 2024"
					time="8:00 AM"
					radius="5 km"
					issued="Atok LGU"
					contact="(074) 123-4567"
				/>
			</div>

			{/* RIGHT */}
			<div className="w-1/2 ">
				<h1>yadgas</h1>
				{/* MAPS */}
				<div className=""></div>
			</div>
		</div>
	);
};

export default AlertDetails;
