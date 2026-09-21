import { Icon } from "@iconify/react";
import { useRef, useState } from "react";
import { ProfilePhoto } from "../ProfilePhoto";
import { MessagePopupMenu, MessageBottomSheet } from "../popup/MessagePopup";
import { AnimatePresence } from "framer-motion";

type UserMessCardProp = {
	read?: boolean;
	active?: boolean;
	name?: string;
	location?: string;
	message?: string;
	onMarkUnread?: () => void;
};

type BubbleChatProps = {
	sender: "user" | "client";
	messages: string[];
};

const LONG_PRESS_MS = 450;

export const UserMessageCard = ({
	read,
	active,
	name,
	location,
	message,
	onMarkUnread,
}: UserMessCardProp) => {
	const [menuPos, setMenuPos] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const buttonRef = useRef<HTMLDivElement>(null);
	const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressFired = useRef(false);

	const toggleMenu = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (menuPos) {
			setMenuPos(null);
			return;
		}
		const rect = buttonRef.current?.getBoundingClientRect();
		if (!rect) return;
		setMenuPos({
			top: rect.bottom + 6,
			left: rect.left + rect.width / 2,
		});
	};

	const handleAction = (label: string) => {
		if (label === "Mark as unread") {
			onMarkUnread?.();
		}
		// TODO: Archive / Delete / Report cases
		setMenuPos(null);
		setSheetOpen(false);
	};

	const startPress = () => {
		longPressFired.current = false;
		pressTimer.current = setTimeout(() => {
			longPressFired.current = true;
			setSheetOpen(true);
		}, LONG_PRESS_MS);
	};

	const cancelPress = () => {
		if (pressTimer.current) {
			clearTimeout(pressTimer.current);
			pressTimer.current = null;
		}
	};

	return (
		<div
			className="group flex items-center gap-3 rounded-lg p-2 cursor-pointer select-none transition-all duration-130 ease-in hover:bg-[#fff1ad]/60 hover:shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]"
			onTouchStart={startPress}
			onTouchEnd={cancelPress}
			onTouchMove={cancelPress}
			onContextMenu={(e) => e.preventDefault()}>
			<div className="relative">
				<div className="relative w-15 h-15">
					<ProfilePhoto />
				</div>
				<div
					className={`absolute bottom-0 right-0 ${active ? "bg-[#8ac44f]" : "bg-[#e2e2e6]"} w-4 h-4 rounded-full border-2 border-white`}></div>
			</div>

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

			<div className="relative opacity-0 transition-all duration-130 ease-in group-hover:opacity-100" ref={buttonRef}>
				<div
					onClick={toggleMenu}
					className="relative w-7 h-7 p-1.5 bg-amber-200 rounded-full shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]">
					<Icon
						icon="akar-icons:more-horizontal"
						className="w-full h-full text-[#ffa004]"
					/>
				</div>

				{menuPos && (
					<>
						<div
							className="fixed inset-0 z-999"
							onClick={(e) => {
								e.stopPropagation();
								setMenuPos(null);
							}}
						/>
						<MessagePopupMenu
							top={menuPos.top}
							left={menuPos.left}
							onAction={handleAction}
						/>
					</>
				)}
			</div>

			<AnimatePresence>
				{sheetOpen && (
					<MessageBottomSheet
						onClose={() => setSheetOpen(false)}
						onAction={handleAction}
					/>
				)}
			</AnimatePresence>
		</div>
	);
};

export const DateTimeMessage = () => {
	return (
		<div className="w-full flex justify-center mt-2">
			<span className="text-center text-[#9e9d7e] text-sm">
				Sept 16 • 5:41 AM
			</span>
		</div>
	);
};

export const BubbleChat = ({ sender, messages }: BubbleChatProps) => {
	const isUser = sender === "user";

	return (
		<div
			className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
			<div className="relative w-8 h-8 shrink-0">
				<ProfilePhoto />
			</div>
			<div
				className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
				{messages.map((msg, i) => (
					<div
						key={i}
						className={`max-w-100 shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] ${isUser ? "bg-linear-to-br from-amber-300 to-amber-400" : "bg-linear-to-br from-yellow-100 to-amber-200"} py-2 px-3 rounded-2xl`}>
						<p className="text-sm">{msg}</p>
					</div>
				))}
			</div>
		</div>
	);
};
