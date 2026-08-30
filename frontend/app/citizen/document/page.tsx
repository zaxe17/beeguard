import { ProfilePhoto } from "@/components/ProfilePhoto";
import ReportDetails from "@/components/ReportDetails";
import { Button, CancelButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

type ButtonVariant = "respond" | "message";

interface ButtonsProps {
	button?: ButtonVariant;
	onAccept?: () => void;
	onReject?: () => void;
	onMessage?: () => void;
}

const BUTTON_CONFIG: Record<ButtonVariant, React.FC<ButtonsProps>> = {
	respond: ({ onAccept, onReject }) => (
		<>
			<CancelButton
				BGcolor="bg-[#e2e2e6]"
				label="Reject"
				onClick={onReject}
				width="120px"
			/>
			<Button label="Accept" onClick={onAccept} width="120px" />
		</>
	),
	message: ({ onMessage }) => (
		<>
			<CancelButton
				BGcolor="bg-[#e2e2e6]"
				textColor="#ff3131"
				width="150px"
				label="Cancel Report"
			/>
			<Button label="Message" onClick={onMessage} width="150px" />
		</>
	),
};

export const Beekeeper = ({ button, ...handlers }: ButtonsProps) => {
	if (!button) return null;

	const Variant = BUTTON_CONFIG[button];

	return (
		<div
			className={`w-full flex items-center gap-3 p-2 transition-all duration-150 ease-in hover:bg-[#fff1ad]/40 rounded-xl ${button === "message" ? "bg-[#fff1ad]/40 shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]" : "hover:bg-[#fff1ad]/40"}`}>
			{/* PROFILE */}
			<div className="w-15 h-15">
				<ProfilePhoto />
			</div>

			{/* NAME AND OFFER */}
			<div className="">
				<h3 className="Poppins-SemiBold text-base">
					John Evans Gutierrez
				</h3>
				<span className="text-sm text-[#a6a3a3]">
					Offer: <span className="text-[#ff9a00]">PHP 5,000</span>
				</span>
			</div>

			{/* ACCEPT AND REJECT BUTTON */}
			<div className="ml-auto pr-3 flex gap-2">
				{<Variant {...handlers} />}
			</div>
		</div>
	);
};

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
