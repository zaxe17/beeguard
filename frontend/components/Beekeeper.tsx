import { ProfilePhoto } from "@/components/ProfilePhoto";
import { Button, CancelButton } from "@/components/ui/Button";

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
