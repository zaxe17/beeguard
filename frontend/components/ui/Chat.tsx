"use client";

import { Icon } from "@iconify/react";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ProfilePhoto } from "../ProfilePhoto";
import { MessagePopupMenu, MessageBottomSheet } from "../popup/MessagePopup";
import { AnimatePresence } from "framer-motion";

// Leaflet needs `window`, so the map is only loaded in the browser.
const LocationMap = dynamic(() => import("./LocationMap"), {
	ssr: false,
	loading: () => <div className="w-full h-full bg-[#f3eed8] animate-pulse" />,
});

// Shape returned by GET/POST /api/chats/<id>/messages and
// POST /api/chats/<id>/location (see services/chat_service.py).
export type ChatMessage = {
	message_id: number;
	chat_id: number;
	sender_role: "Citizen" | "Beekeeper";
	content: string;
	is_read: boolean;
	sent_at: string;
	message_type: "text" | "location" | "image";
	image_url: string | null;
	latitude: number | null;
	longitude: number | null;
	live_share: boolean; // was sent as a live share (even if it has ended)
	is_live: boolean; // still live right now
	live_seconds_left: number;
	location_age_seconds: number | null;
	// Only on this device, never from the server: a message you just
	// typed, shown right away while it's being sent (ChatPage.tsx).
	client_status?: "sending" | "failed";
};

type UserMessCardProp = {
	chatId: number;
	read?: boolean;
	active?: boolean;
	name?: string;
	location?: string;
	message?: string;
	onMarkUnread?: () => void;
};

type BubbleChatProps = {
	sender: "user" | "client";
	messages: ChatMessage[];
	onStopLive?: (messageId: number) => void;
	// Tap a "Not sent" message to send it again.
	onRetry?: (message: ChatMessage) => void;
};

const LONG_PRESS_MS = 450;

export const UserMessageCard = ({
	chatId,
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
		// Delete / Report are handled by the DeleteChat / ReportChat
		// modals themselves (mounted globally in layout.tsx) — this
		// component only needs to close its own menu/sheet.
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
							chatId={chatId}
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
						chatId={chatId}
						onClose={() => setSheetOpen(false)}
						onAction={handleAction}
					/>
				)}
			</AnimatePresence>
		</div>
	);
};

// FIXED — this always said "Sept 16 • 5:41 AM". Now it shows the real
// day and time of the first message after it:
//   today      -> "Today • 3:14 PM"
//   yesterday  -> "Yesterday • 9:02 AM"
//   this year  -> "Sep 16 • 5:41 AM"
//   older      -> "Sep 16, 2025 • 5:41 AM"
const formatChatDate = (iso?: string) => {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	const now = new Date();
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (d.toDateString() === now.toDateString()) return `Today • ${time}`;
	if (d.toDateString() === yesterday.toDateString()) return `Yesterday • ${time}`;
	const day = d.toLocaleDateString([], {
		month: "short",
		day: "numeric",
		...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
	});
	return `${day} • ${time}`;
};

export const DateTimeMessage = ({ date }: { date?: string }) => {
	const label = formatChatDate(date);
	if (!label) return null;
	return (
		<div className="w-full flex justify-center mt-2">
			<span className="text-center text-[#9e9d7e] text-sm">{label}</span>
		</div>
	);
};

// ── LOCATION BUBBLE ─────────────────────────────

const formatTimeLeft = (seconds: number) => {
	if (seconds >= 3600) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		return m ? `${h} hr ${m} min` : `${h} hr`;
	}
	if (seconds >= 60) return `${Math.floor(seconds / 60)} min`;
	return "under a minute";
};

const formatAgo = (seconds: number) =>
	seconds < 3600
		? `${Math.max(1, Math.floor(seconds / 60))} min ago`
		: `${Math.floor(seconds / 3600)} hr ago`;

const LocationBubble = ({
	message,
	isUser,
	onStopLive,
}: {
	message: ChatMessage;
	isUser: boolean;
	onStopLive?: (messageId: number) => void;
}) => {
	const lat = message.latitude as number;
	const lng = message.longitude as number;
	const live = message.is_live;
	const ended = message.live_share && !live;
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

	const title = isUser
		? live
			? "You're sharing your live location"
			: "You shared a location"
		: live
			? "Sharing live location"
			: "Shared a location";

	let status = "Pinned location";
	if (live) status = `Live · ${formatTimeLeft(message.live_seconds_left)} left`;
	else if (ended) status = "Live location ended";

	// Sender's device stopped sending updates (tab closed, no signal…).
	const stale =
		live &&
		message.location_age_seconds !== null &&
		message.location_age_seconds > 60;

	return (
		<div
			className={`w-64 overflow-hidden rounded-2xl shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] ${isUser ? "bg-linear-to-br from-amber-300 to-amber-400" : "bg-linear-to-br from-yellow-100 to-amber-200"}`}>
			{/* MAP — `isolate` keeps Leaflet's z-indexes inside the bubble */}
			<div className={`relative w-full h-36 isolate ${ended ? "grayscale opacity-70" : ""}`}>
				<LocationMap latitude={lat} longitude={lng} live={live} />
				{live && (
					<span className="absolute top-2 left-2 z-500 flex items-center gap-1 bg-[#ffa004] text-white text-[10px] Poppins-SemiBold px-2 py-0.5 rounded-full">
						<span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
						LIVE
					</span>
				)}
			</div>

			<div className="px-3 py-2 flex flex-col gap-1">
				<div className="flex items-center gap-1.5">
					<Icon
						icon={live ? "mdi:crosshairs-gps" : "mdi:map-marker"}
						className="w-4 h-4 text-[#4a2f00] shrink-0"
					/>
					<span className="text-sm Poppins-SemiBold text-[#4a2f00]">{title}</span>
				</div>
				<span className="text-[11px] text-[#6b5a2e]">
					{status}
					{stale && ` · updated ${formatAgo(message.location_age_seconds as number)}`}
				</span>

				<div className="flex gap-2 mt-1">
					<a
						href={mapsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="flex-1 text-center text-xs Poppins-Medium bg-white/70 hover:bg-white rounded-full py-1.5 transition-all duration-130 ease-in">
						Open in Maps
					</a>
					{isUser && live && onStopLive && (
						<button
							onClick={() => onStopLive(message.message_id)}
							className="flex-1 text-xs Poppins-Medium text-white bg-red-600 hover:bg-red-700 rounded-full py-1.5 transition-all duration-130 ease-in">
							Stop sharing
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

// ── IMAGE BUBBLE ────────────────────────────────
const ImageBubble = ({ message }: { message: ChatMessage }) => (
	<a
		href={message.image_url as string}
		target="_blank"
		rel="noopener noreferrer"
		className="block max-w-64 overflow-hidden rounded-2xl shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] bg-[#f3eed8]">
		{/* eslint-disable-next-line @next/next/no-img-element */}
		<img
			src={message.image_url as string}
			alt="Photo"
			loading="lazy"
			className="block w-full h-auto max-h-80 object-cover"
		/>
	</a>
);

export const BubbleChat = ({
	sender,
	messages,
	onStopLive,
	onRetry,
}: BubbleChatProps) => {
	const isUser = sender === "user";

	return (
		<div
			className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
			<div className="relative w-8 h-8 shrink-0">
				<ProfilePhoto />
			</div>
			<div
				className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
				{messages.map((msg) =>
					msg.message_type === "image" && msg.image_url ? (
						<ImageBubble key={msg.message_id} message={msg} />
					) : msg.message_type === "location" &&
					msg.latitude !== null &&
					msg.longitude !== null ? (
						<LocationBubble
							key={msg.message_id}
							message={msg}
							isUser={isUser}
							onStopLive={onStopLive}
						/>
					) : (
						<div
							key={msg.message_id}
							className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-full`}>
							<div
								onClick={
									msg.client_status === "failed" && onRetry
										? () => onRetry(msg)
										: undefined
								}
								className={`max-w-[75vw] lg:max-w-100 shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)] ${isUser ? "bg-linear-to-br from-amber-300 to-amber-400" : "bg-linear-to-br from-yellow-100 to-amber-200"} py-2 px-3 rounded-2xl transition-opacity duration-150 ${msg.client_status === "sending" ? "opacity-60" : ""} ${msg.client_status === "failed" ? "opacity-70 cursor-pointer ring-1 ring-red-400" : ""}`}>
								<p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
							</div>
							{msg.client_status === "sending" && (
								<span className="text-[10px] text-[#a6a3a3] mt-0.5">Sending…</span>
							)}
							{msg.client_status === "failed" && (
								<span className="text-[10px] text-red-600 mt-0.5">
									Not sent · tap to retry
								</span>
							)}
						</div>
					),
				)}
			</div>
		</div>
	);
};