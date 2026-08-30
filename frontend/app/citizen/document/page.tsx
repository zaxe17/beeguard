import { ProfilePhoto } from "@/components/ProfilePhoto";
import ReportDetails from "@/components/ReportDetails";
import { Container } from "@/components/ui/Container";
import { Beekeeper } from "@/components/Beekeeper";

const Offer = () => {
	return (
		<Container width="100%" className="shrink-0 max-w-2xl">
			<span className="Poppins-SemiBold text-[#a6a3a3] text-base">
				Choose Offer
			</span>
			{/* OFFERS */}
			<div className="w-full max-h-70 overflow-y-scroll flex flex-col pr-1">
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
				<Beekeeper button="respond" />
			</div>
		</Container>
	);
};

// FOR CASH UPON RESCUE PAYMENT
const Payment = ({ method }: { method: "online" | "cash" }) => {
	return (
		<div className="w-full">
			<p className="Poppins-SemiBold text-[#a6a3a3] text-base mb-2">
				Beekeeper Assigned
			</p>
			<Beekeeper button="message" />
		</div>
	);
};

const Document = () => {
	return (
		<>
			<h1 className="Poppins-SemiBold text-xl pb-5">Report Details</h1>

			{/* DISPLAY REPORT DETAILS */}
			<ReportDetails
				status="resolved"
				reportId="BG-2026-001"
				specification="Apis cerana / Asian Honey Bee"
				location="Payatas, Quezon City"
				date="March 29, 2026"
				time="9:41 am"
				details="Near basketball court, on a mango tree."
				activity="Calm"
				danger="Yes"
			/>

			{/* CHOOSING BEEKEEPER OFFERS */}
			{/* <Offer /> */}

			<Payment method="online" />
		</>
	);
};

export default Document;
