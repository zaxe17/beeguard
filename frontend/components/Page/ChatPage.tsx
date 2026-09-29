"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import {
	UserMessageCard,
	BubbleChat,
	DateTimeMessage,
	type ChatMessage,
} from "../ui/Chat";
import { Container } from "../ui/Container";
import { SearchBar } from "../ui/Input";
import { ProfilePhoto } from "../ProfilePhoto";
import MobileOverlay from "@/components/MobileOverlay";
import { useQueryParamState } from "@/hooks/useQueryParamState";
import { ChatOptionMenu } from "../popup/MessagePopup";
import { LocationShareModal } from "../ui/LocationShareModal";
import { api } from "@/services/api";
import {
	ChatMessagesSkeleton,
	UserMessageCardSkeleton,
} from "@/components/loading/SkeletonLoading";

// Shape returned by GET /api/chats (see services/chat_service.py).
type ChatUser = {
	chat_id: number;
	name: string;
	location: string;
	message: string;
	active?: boolean;
	read?: boolean;
};

// Bubble rendering groups messages by day and by "self vs other" —
// derived client-side from ChatMessage.sender_role, since the backend
// just returns a flat, chronological list.
type ChatEntry =
	| {
			type: "bubble";
			sender: "user" | "client";
			messages: ChatMessage[];
			key: string;
	  }
	| { type: "date"; key: string };

const MESSAGE_POLL_MS = 4000;
const LIST_POLL_MS = 8000;
// How often the sender pushes a new position while a live share runs.
const LIVE_UPDATE_MS = 10000;
// Fired by ChatModal.tsx's Delete modal after a successful delete, so
// this list updates immediately instead of waiting for the next poll.
const CHATS_CHANGED_EVENT = "beeguard:chats-changed";
// Fired by ChatOptionMenu's "Location" / "Image" items (MessagePopup.tsx).
const SHARE_LOCATION_EVENT = "beeguard:share-location";
const PICK_IMAGE_EVENT = "beeguard:pick-image";

// Photos are shrunk in the browser before upload: faster on mobile
// data, and well under the backend's 5 MB limit.
const IMAGE_MAX_SIDE = 1600;
const IMAGE_QUALITY = 0.82;
const IMAGE_PICK_MAX_BYTES = 20 * 1024 * 1024; // reject absurd files early

const fileToCompressedDataUrl = (file: File) =>
	new Promise<string>((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new window.Image();
		img.onload = () => {
			const scale = Math.min(
				1,
				IMAGE_MAX_SIDE / Math.max(img.width, img.height),
			);
			const canvas = document.createElement("canvas");
			canvas.width = Math.round(img.width * scale);
			canvas.height = Math.round(img.height * scale);
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				URL.revokeObjectURL(url);
				reject(new Error("canvas"));
				return;
			}
			// White background so transparent PNGs don't turn black.
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("decode"));
		};
		img.src = url;
	});

const sameDay = (a: string, b: string) =>
	new Date(a).toDateString() === new Date(b).toDateString();

// `myRole` decides which sender_role maps to "user" (right-aligned,
// this device) vs "client" (left-aligned, the other party).
const buildEntries = (
	messages: ChatMessage[],
	myRole: "citizen" | "beekeeper",
): ChatEntry[] => {
	const mySenderRole = myRole === "citizen" ? "Citizen" : "Beekeeper";
	const entries: ChatEntry[] = [];
	let lastDate: string | null = null;
	let runSender: "user" | "client" | null = null;
	let runMessages: ChatMessage[] = [];

	const flushRun = (key: string) => {
		if (runSender && runMessages.length) {
			entries.push({
				type: "bubble",
				sender: runSender,
				messages: runMessages,
				key,
			});
		}
		runMessages = [];
	};

	messages.forEach((m, i) => {
		if (!lastDate || !sameDay(lastDate, m.sent_at)) {
			flushRun(`flush-${i}`);
			runSender = null;
			entries.push({ type: "date", key: `date-${m.message_id}` });
		}
		lastDate = m.sent_at;

		const sender: "user" | "client" =
			m.sender_role === mySenderRole ? "user" : "client";
		if (sender !== runSender) {
			flushRun(`flush-${i}`);
			runSender = sender;
		}
		runMessages.push(m);
	});
	flushRun("flush-end");

	return entries;
};

// ── Geolocation helpers ─────────────────────────
const getCurrentPosition = () =>
	new Promise<GeolocationPosition>((resolve, reject) => {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			reject(new Error("unsupported"));
			return;
		}
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			enableHighAccuracy: true,
			timeout: 15000,
			maximumAge: 0,
		});
	});

const geoErrorMessage = (err: unknown) => {
	// Browsers only allow geolocation on https:// or localhost.
	if (typeof window !== "undefined" && !window.isSecureContext) {
		return "Location only works on https:// or localhost.";
	}
	if ((err as Error)?.message === "unsupported") {
		return "This browser doesn't support location sharing.";
	}
	const code = (err as GeolocationPositionError)?.code;
	if (code === 1) {
		return "Location permission was denied. Allow it in your browser's site settings, then try again.";
	}
	if (code === 3) return "Getting your location took too long. Try again.";
	return "Couldn't get your location. Try again.";
};

const ChatPage = () => {
	const pathname = usePathname();

	// get segment after "/" — "citizen", "admin", o "beekeeper"
	const role = pathname.split("/")[1] as "citizen" | "beekeeper";
	const apiRole: "citizen" | "beekeeper" =
		role === "beekeeper" ? "beekeeper" : "citizen";
	const mySenderRole = apiRole === "citizen" ? "Citizen" : "Beekeeper";

	const [users, setUsers] = useState<ChatUser[]>([]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	// Loading states for the skeletons.
	// chatsLoading: true only until the FIRST chat-list fetch finishes
	// (the 8s polling never sets it back to true, so no flicker).
	// messagesLoading: true whenever a different chat is opened, until
	// its first fetch finishes.
	const [chatsLoading, setChatsLoading] = useState(true);
	const [messagesLoading, setMessagesLoading] = useState(false);

	// Photo sending
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [sendingImage, setSendingImage] = useState(false);
	const [composerError, setComposerError] = useState<string | null>(null);

	// Location sharing
	const [locationModalOpen, setLocationModalOpen] = useState(false);
	const [locationBusy, setLocationBusy] = useState(false);
	const [locationError, setLocationError] = useState<string | null>(null);

	const {
		value: selectedIdParam,
		setValue: setChatParam,
		clearValue: closeChat,
	} = useQueryParamState("chat");

	const selectedId = selectedIdParam ? Number(selectedIdParam) : null;
	const selectedUser = users.find((u) => u.chat_id === selectedId) ?? null;
	const mobileSelected = Boolean(selectedId);

	const loadChats = useCallback(async () => {
		const res = await api.get<ChatUser[]>("/chats");
		if (res.success && res.data) setUsers(res.data);
		setChatsLoading(false); // <- FIX: wala ito dati, kaya nakaipit ang skeleton
	}, []);

	// ── Load chat list, then keep it fresh ──────────────
	useEffect(() => {
		loadChats();
		const interval = setInterval(loadChats, LIST_POLL_MS);
		return () => clearInterval(interval);
	}, [loadChats]);

	// ── React to a Delete from the "..." menu / bottom sheet ─
	useEffect(() => {
		const handleChanged = (e: Event) => {
			loadChats();
			const detail = (e as CustomEvent<{ deletedChatId?: number }>)
				.detail;
			if (detail?.deletedChatId && detail.deletedChatId === selectedId) {
				closeChat();
			}
		};
		window.addEventListener(CHATS_CHANGED_EVENT, handleChanged);
		return () =>
			window.removeEventListener(CHATS_CHANGED_EVENT, handleChanged);
	}, [loadChats, selectedId, closeChat]);

	// ── "Location" clicked in the + menu ────────────────
	useEffect(() => {
		const openLocationModal = () => {
			setLocationError(null);
			setLocationModalOpen(true);
		};
		window.addEventListener(SHARE_LOCATION_EVENT, openLocationModal);
		return () =>
			window.removeEventListener(SHARE_LOCATION_EVENT, openLocationModal);
	}, []);

	// ── "Image" clicked in the + menu ───────────────────
	useEffect(() => {
		const openPicker = () => {
			setComposerError(null);
			fileInputRef.current?.click();
		};
		window.addEventListener(PICK_IMAGE_EVENT, openPicker);
		return () => window.removeEventListener(PICK_IMAGE_EVENT, openPicker);
	}, []);

	// Clear the composer error when switching conversations.
	useEffect(() => {
		setComposerError(null);
	}, [selectedId]);

	// ── Load + poll messages for the selected chat ──────
	// Polling is also what moves the other person's live pin.
	useEffect(() => {
		if (!selectedId) {
			setMessages([]);
			setMessagesLoading(false);
			return;
		}
		let cancelled = false;

		// Huwag ipakita ang messages ng dating chat habang naglo-load ang bago.
		setMessages([]);
		setMessagesLoading(true);

		const loadMessages = async () => {
			const res = await api.get<ChatMessage[]>(
				`/chats/${selectedId}/messages`,
			);
			if (cancelled) return;
			if (res.success && res.data) {
				setMessages(res.data);
			} else {
				// Chat no longer exists (e.g. just deleted) — drop the
				// dead selection instead of polling a 403/404 forever.
				closeChat();
			}
			setMessagesLoading(false);
		};

		loadMessages();
		const interval = setInterval(loadMessages, MESSAGE_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [selectedId, closeChat]);

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
	}, [messages, messagesLoading]);

	// ── Keep MY live location(s) updated ────────────────
	// A stable string key, so the 4s message poll (which replaces the
	// array) doesn't restart the GPS watch every time.
	const myLiveIdsKey = messages
		.filter(
			(m) =>
				m.message_type === "location" &&
				m.is_live &&
				m.sender_role === mySenderRole,
		)
		.map((m) => m.message_id)
		.join(",");

	useEffect(() => {
		if (!myLiveIdsKey) return;
		if (typeof navigator === "undefined" || !navigator.geolocation) return;

		const ids = myLiveIdsKey.split(",").map(Number);
		let latest: GeolocationPosition | null = null;

		const push = () => {
			if (!latest) return;
			const { latitude, longitude } = latest.coords;
			ids.forEach((id) => {
				api.post(`/chats/messages/${id}/location`, {
					latitude,
					longitude,
				});
			});
		};

		const watchId = navigator.geolocation.watchPosition(
			(pos) => {
				const first = latest === null;
				latest = pos;
				if (first) push();
			},
			() => {
				// Ignore transient GPS errors; the next fix will be sent.
			},
			{ enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
		);
		// Send on a timer too, so a sender who isn't moving still shows
		// as "live" instead of "updated X min ago".
		const interval = setInterval(push, LIVE_UPDATE_MS);

		return () => {
			navigator.geolocation.clearWatch(watchId);
			clearInterval(interval);
		};
	}, [myLiveIdsKey]);

	const handleSelectUser = (user: ChatUser) => {
		setChatParam(String(user.chat_id));
	};

	const handleSend = async () => {
		const content = draft.trim();
		if (!content || !selectedId) return;
		setDraft("");
		const res = await api.post<ChatMessage>(
			`/chats/${selectedId}/messages`,
			{ content },
		);
		if (res.success && res.data) {
			setMessages((prev) => [...prev, res.data as ChatMessage]);
		}
	};

	const handleImageSelected = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		// Reset so choosing the same photo again still fires onChange.
		e.target.value = "";
		if (!file || !selectedId || sendingImage) return;

		if (!file.type.startsWith("image/")) {
			setComposerError("Please choose an image file.");
			return;
		}
		if (file.size > IMAGE_PICK_MAX_BYTES) {
			setComposerError("That image is too large (max 20 MB).");
			return;
		}

		setSendingImage(true);
		setComposerError(null);
		try {
			const image = await fileToCompressedDataUrl(file);
			const res = await api.post<ChatMessage>(
				`/chats/${selectedId}/images`,
				{ image },
			);
			if (res.success && res.data) {
				setMessages((prev) => [...prev, res.data as ChatMessage]);
				loadChats();
			} else {
				setComposerError(res.message || "Couldn't send the photo.");
			}
		} catch {
			setComposerError("Couldn't read that image. Try a JPG or PNG.");
		} finally {
			setSendingImage(false);
		}
	};

	const handleMarkUnread = async (chatId: number) => {
		// Close the conversation first — while it's open, every poll
		// marks it as read again.
		if (chatId === selectedId) closeChat();
		setUsers((prev) =>
			prev.map((u) => (u.chat_id === chatId ? { ...u, read: false } : u)),
		);
		const res = await api.post(`/chats/${chatId}/unread`, {});
		if (!res.success) loadChats();
	};

	const handleShareLocation = async (liveMinutes: number) => {
		if (!selectedId || locationBusy) return;
		setLocationBusy(true);
		setLocationError(null);
		try {
			const pos = await getCurrentPosition();
			const res = await api.post<ChatMessage>(
				`/chats/${selectedId}/location`,
				{
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
					live_minutes: liveMinutes,
				},
			);
			if (res.success && res.data) {
				const sent = res.data as ChatMessage;
				setMessages((prev) => [
					// Starting a new live share ends my previous one (server
					// does the same) — reflect it now, not on the next poll.
					...prev.map((m) =>
						liveMinutes > 0 &&
						m.message_type === "location" &&
						m.sender_role === mySenderRole &&
						m.is_live
							? { ...m, is_live: false, live_seconds_left: 0 }
							: m,
					),
					sent,
				]);
				setLocationModalOpen(false);
			} else {
				setLocationError(
					res.message || "Couldn't share your location.",
				);
			}
		} catch (err) {
			setLocationError(geoErrorMessage(err));
		} finally {
			setLocationBusy(false);
		}
	};

	const handleStopLive = async (messageId: number) => {
		// Update the UI first so the GPS watch stops right away.
		setMessages((prev) =>
			prev.map((m) =>
				m.message_id === messageId
					? { ...m, is_live: false, live_seconds_left: 0 }
					: m,
			),
		);
		await api.post(`/chats/messages/${messageId}/location/stop`, {});
	};

	const activeConversation = buildEntries(messages, apiRole);

	// Plain function returning JSX (not a component), so React keeps
	// the same DOM nodes between renders.
	// Shows the skeleton bubbles while the chat's first fetch is running.
	const renderConversation = () =>
		messagesLoading ? (
			<ChatMessagesSkeleton />
		) : (
			activeConversation.map((entry) =>
				entry.type === "date" ? (
					<DateTimeMessage key={entry.key} />
				) : (
					<BubbleChat
						key={entry.key}
						sender={entry.sender}
						messages={entry.messages}
						onStopLive={handleStopLive}
					/>
				),
			)
		);

	// "Sending photo…" / error line shown just above the message box.
	const composerStatus =
		sendingImage || composerError ? (
			<div className="px-3 -mb-1 text-xs shrink-0">
				{sendingImage ? (
					<span className="flex items-center gap-1.5 text-[#817b70]">
						<Icon
							icon="svg-spinners:ring-resize"
							className="w-3.5 h-3.5"
						/>
						Sending photo…
					</span>
				) : (
					<span className="text-red-600">{composerError}</span>
				)}
			</div>
		) : null;

	// FIXED — was `const ConversationView = () => (<>...` (a component
	// defined INSIDE ChatPage's render body). Redefining a function
	// component on every render makes React treat it as a new
	// component type each time, so it unmounts/remounts the whole
	// subtree — including this <textarea> — on every keystroke,
	// dropping focus and making it look like you can't type
	// consecutively. Using a plain JSX variable instead keeps the
	// underlying DOM elements stable across re-renders.
	const conversationView = (
		<>
			{/* CHAT NAV */}
			<div className="flex items-center bg-[#ffdb4f] p-2 gap-3 shrink-0">
				<div className="relative">
					<div className="relative w-10 h-10">
						<ProfilePhoto />
					</div>
					<div className="absolute bottom-0 right-0 bg-[#8ac44f] w-4 h-4 rounded-full border-2 border-white"></div>
				</div>
				<h3 className="text-base">{selectedUser?.name}</h3>
			</div>

			{/* CONVERSATION BODY */}
			<div className="flex-1 min-h-0 flex flex-col justify-end">
				<div
					ref={scrollRef}
					className="overflow-y-auto overflow-x-hidden min-h-0 flex flex-col gap-2 p-3 lg:scrollbar-auto scrollbar-none">
					{renderConversation()}
				</div>
			</div>

			{composerStatus}

			{/* INPUT MESSAGE */}
			<div className="w-full p-2 mb-3 flex flex-row items-center gap-1 shrink-0">
				<ChatOptionMenu />

				<textarea
					placeholder="Message..."
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSend();
						}
					}}
					className="rounded-full bg-[#d9d9d9] resize-none h-8 w-full px-3 pt-1.5 text-sm outline-none"
				/>
				<button onClick={handleSend} className="w-10 h-10">
					<Icon
						icon="basil:send-solid"
						className="w-10 h-10 text-[#ffdb4f]"
					/>
				</button>
			</div>
		</>
	);

	return (
		<div className="w-full h-full flex items-start lg:flex-row flex-col relative">
			{/* LEFT SIDE */}
			<Container
				borderNone
				className="lg:w-[30%] w-full flex-1 lg:flex-none lg:h-full">
				<div className="relative w-full px-2 flex flex-col items-center gap-4">
					<h3 className="relative Poppins-SemiBold text-xl text-[#020101]">
						Messages
					</h3>
					<SearchBar placeholder="Search Messages" />
				</div>

				{/* SCROLLABLE MESSAGE LIST */}
				<div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none px-1">
					{chatsLoading &&
						Array.from({ length: 6 }).map((_, i) => (
							<UserMessageCardSkeleton key={i} />
						))}

					{!chatsLoading && users.length === 0 && (
						<div className="text-center text-sm text-[#a6a3a3] py-4">
							No conversations yet.
						</div>
					)}

					{!chatsLoading &&
						users.map((u) => (
							<div
								key={u.chat_id}
								onClick={() => handleSelectUser(u)}>
								<UserMessageCard
									chatId={u.chat_id}
									active={u.active}
									read={u.read}
									name={u.name}
									location={u.location}
									message={u.message}
									onMarkUnread={() =>
										handleMarkUnread(u.chat_id)
									}
								/>
							</div>
						))}
				</div>
			</Container>

			{/* RIGHT SIDE — desktop: always visible inline */}
			<div className="hidden lg:flex flex-col flex-1 w-full min-h-0 h-full">
				{selectedUser ? (
					conversationView
				) : selectedId && chatsLoading ? (
					// ?chat=<id> was opened directly (refresh / push
					// notification) and the chat list hasn't arrived yet.
					<div className="flex-1 flex flex-col justify-end p-3">
						<ChatMessagesSkeleton />
					</div>
				) : (
					<div className="flex-1 flex items-center justify-center text-[#a6a3a3]">
						Select a conversation to start chatting.
					</div>
				)}
			</div>

			{/* RIGHT SIDE — mobile: slide-up overlay, only after a user is selected */}
			{mobileSelected && selectedUser && (
				<MobileOverlay>
					<div className="flex flex-col h-full">
						{/* BACK BUTTON */}
						<div className="sticky top-0 z-10 bg-[#ffdb4f] w-full flex items-center gap-3 p-2 shrink-0">
							<button
								onClick={closeChat}
								className="flex items-center shrink-0">
								<Icon
									icon="bx:arrow-back"
									className="text-2xl text-[#4a2f00]"
								/>
							</button>
							<div className="relative">
								<div className="relative w-10 h-10">
									<ProfilePhoto />
								</div>
								<div className="absolute bottom-0 right-0 bg-[#8ac44f] w-4 h-4 rounded-full border-2 border-white"></div>
							</div>
							<h3 className="text-base">{selectedUser.name}</h3>
						</div>

						{/* CONVERSATION BODY */}
						<div className="flex-1 min-h-0 flex flex-col justify-end">
							<div
								ref={scrollRef}
								className="overflow-y-auto overflow-x-hidden min-h-0 flex flex-col gap-2 p-3 lg:scrollbar-auto scrollbar-none">
								{renderConversation()}
							</div>
						</div>

						{composerStatus}

						{/* INPUT MESSAGE */}
						<div className="w-full p-2 mb-3 flex flex-row items-center gap-1 shrink-0">
							<ChatOptionMenu />
							<textarea
								placeholder="Message..."
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleSend();
									}
								}}
								className="rounded-full bg-[#d9d9d9] resize-none h-8 w-full px-3 pt-1.5 text-sm outline-none"
							/>
							<button onClick={handleSend} className="w-10 h-10">
								<Icon
									icon="basil:send-solid"
									className="w-10 h-10 text-[#ffdb4f]"
								/>
							</button>
						</div>
					</div>
				</MobileOverlay>
			)}

			{/* HIDDEN FILE PICKER — opened by the + menu's "Image" item */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleImageSelected}
			/>

			{/* LOCATION SHARE PICKER */}
			<LocationShareModal
				open={locationModalOpen && Boolean(selectedId)}
				busy={locationBusy}
				error={locationError}
				onClose={() => setLocationModalOpen(false)}
				onShare={handleShareLocation}
			/>
		</div>
	);
};

export default ChatPage;
