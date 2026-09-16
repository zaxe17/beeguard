import { ProfilePhoto } from "../ProfilePhoto";

type UserMessCardProp = {
	read?: boolean;
	active?: boolean;
	name?: string;
	location?: string;
	message?: string;
};

type BubbleChatProps = {
	sender: "user" | "client";
	messages: string[];
};

// USER MESSAGE CARD
export const UserMessageCard = ({
	read,
	active,
	name,
	location,
	message,
}: UserMessCardProp) => {
	return (
		<div className="flex items-center gap-3 rounded-lg p-2 cursor-pointer">
			<div className="relative">
				<div className="relative w-15 h-15">
					<ProfilePhoto />
				</div>
				<div
					className={`absolute bottom-0 right-0 ${active ? "bg-[#8ac44f]" : "bg-[#e2e2e6]"} w-4 h-4 rounded-full border-2 border-white`}></div>
			</div>

			{/* DISPLAY INFO */}
			<div className="w-full flex-1 flex flex-col justify-between">
				<h3
					className={`${read ? "Poppins-SemiBold text-[#494949]" : "Poppins-Bold"} text-sm`}>
					{name}
				</h3>
				<span
					className={`${read ? "text-[#a6a3a3]" : "Poppins-SemiBold text-[#646361]"} text-[11px] text-[#a6a3a3]`}>
					{location}
				</span>
				<span
					className={`${read ? "text-[#817b70]" : "Poppins-SemiBold text-black"} text-xs line-clamp-1`}>
					{message}
				</span>
			</div>
		</div>
	);
};

// DATE AND TIME
export const DateTimeMessage = () => {
	return (
		<div className="w-full flex justify-center mt-2">
			<span className="text-center text-[#9e9d7e] text-sm">
				Sept 16 • 5:41 AM
			</span>
		</div>
	);
};

// BUBBLE CHAT
export const BubbleChat = ({ sender, messages }: BubbleChatProps) => {
	const isUser = sender === "user";

	return (
		<div
			className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
			{/* PROFILE PIC */}
			<div className="relative w-8 h-8 shrink-0">
				<ProfilePhoto />
			</div>

			{/* MESSAGES */}
			<div
				className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
				{messages.map((msg, i) => (
					<div
						key={i}
						className={`max-w-100 ${isUser ? "bg-linear-to-br from-amber-300 to-amber-400" : "bg-linear-to-br from-yellow-100 to-amber-200"} py-2 px-3 rounded-2xl`}>
						<p className="text-sm">{msg}</p>
					</div>
				))}
			</div>
		</div>
	);
};
