// components/Page/ChatPage.tsx
//
// CHANGES (deployment fixes):
//  1. Opens at the LATEST message. The scroll area is anchored to the
//     bottom (flex-col-reverse), so photos/maps that finish loading later
//     no longer push the view back up. Before, the mobile view never
//     scrolled down at all, and the desktop one jumped back to the bottom
//     every 4 s while you were reading older messages.
//  2. Messenger-style loading: only the latest 30 messages are fetched
//     (and polled); older ones load when you scroll to the top.
//     Before, all messages were downloaded again every 4 seconds.
//  3. Sending feels instant: your message shows right away ("Sending…"),
//     then becomes normal when the server saves it. If it fails it says
//     "Not sent · tap to retry".
//  4. Phone keyboard: the chat screen shrinks to the space above the
//     keyboard (visualViewport), so the message box and the latest
//     messages stay visible while typing.
//     FIXED — the phone chat covered the whole screen, so the bottom nav
//     bar (Sidebar.tsx, z-9999) sat on top of the message box, "+" and
//     Send. Now the chat ends ABOVE the bottom nav; only when the keyboard
//     is open does the message box move up above the keyboard.
//  5. Real dates between messages (was always "Sept 16 • 5:41 AM").
//  6. Chat sound when a new message comes in (works even without push).

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
import { useQueryParamState } from "@/hooks/useQueryParamState";
import { ChatOptionMenu } from "../popup/MessagePopup";
import { LocationShareModal } from "../ui/LocationShareModal";
import { api } from "@/services/api";
import { playNotificationSound } from "@/lib/notifySound";

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
	| { type: "bubble"; sender: "user" | "client"; messages: ChatMessage[]; key: string }
	| { type: "date"; key: string; date: string };

const MESSAGE_POLL_MS = 4000;
const LIST_POLL_MS = 8000;
// Messages per page (first load, each poll, each "load older").
const PAGE_SIZE = 30;
// Start loading older messages this close (px) to the top.
const LOAD_OLDER_AT_PX = 120;
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
			const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.width, img.height));
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
const buildEntries = (messages: ChatMessage[], myRole: "citizen" | "beekeeper"): ChatEntry[] => {
	const mySenderRole = myRole === "citizen" ? "Citizen" : "Beekeeper";
	const entries: ChatEntry[] = [];
	let lastDate: string | null = null;
	let runSender: "user" | "client" | null = null;
	let runMessages: ChatMessage[] = [];

	const flushRun = (key: string) => {
		if (runSender && runMessages.length) {
			entries.push({ type: "bubble", sender: runSender, messages: runMessages, key });
		}
		runMessages = [];
	};

	messages.forEach((m, i) => {
		if (!lastDate || !sameDay(lastDate, m.sent_at)) {
			flushRun(`flush-${i}`);
			runSender = null;
			entries.push({ type: "date", key: `date-${m.message_id}`, date: m.sent_at });
		}
		lastDate = m.sent_at;

		const sender: "user" | "client" = m.sender_role === mySenderRole ? "user" : "client";
		if (sender !== runSender) {
			flushRun(`flush-${i}`);
			runSender = sender;
		}
		runMessages.push(m);
	});
	flushRun("flush-end");

	return entries;
};

// ── Message list helpers ────────────────────────
const byId = (a: ChatMessage, b: ChatMessage) => a.message_id - b.message_id;

// Puts the latest page from the server into what we already have:
// updates messages in that range (live locations move), adds new ones,
// drops ones that were deleted, keeps older pages and my unsent messages.
const mergeLatest = (prev: ChatMessage[], latest: ChatMessage[]): ChatMessage[] => {
	const local = prev.filter((m) => m.client_status); // my "Sending…/Not sent"
	const saved = prev.filter((m) => !m.client_status);
	if (latest.length === 0) return [...local];
	const oldestInPage = latest[0].message_id;
	const kept = saved.filter((m) => m.message_id < oldestInPage);
	return [...kept, ...latest].sort(byId).concat(local);
};

const tempIdSeq = { n: -1 };

// true = desktop layout (Tailwind "lg", 1024px+), null = not known yet
// (first render), so neither chat view flashes on the wrong screen.
const useIsLargeScreen = () => {
	const [large, setLarge] = useState<boolean | null>(null);
	useEffect(() => {
		const mq = window.matchMedia("(min-width: 1024px)");
		const update = () => setLarge(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);
	return large;
};

// Height of the phone's bottom nav bar (components/Sidebar.tsx renders a
// <nav>; on phones it sits at the bottom of the screen). 0 on desktop or
// if it isn't found.
const bottomNavHeight = () => {
	const nav = document.querySelector("nav");
	if (!nav) return 0;
	const r = nav.getBoundingClientRect();
	// Only count it when it's really at the bottom (phone layout).
	return r.top > window.innerHeight / 2 ? r.height : 0;
};

// When the visible screen is this much shorter than the page, the
// on-screen keyboard is open.
const KEYBOARD_MIN_PX = 120;

// Chat screen size on phones.
// visualViewport = the part of the screen NOT covered by the keyboard.
//   keyboard closed -> the chat ends above the bottom nav bar
//   keyboard open   -> the chat ends right above the keyboard (the nav bar
//                      is behind the keyboard then)
const useVisibleViewport = (active: boolean) => {
	const [box, setBox] = useState<{ height: number; top: number } | null>(null);
	useEffect(() => {
		if (!active || typeof window === "undefined" || !window.visualViewport) {
			setBox(null);
			return;
		}
		const vv = window.visualViewport;
		const update = () => {
			const keyboardOpen = window.innerHeight - vv.height > KEYBOARD_MIN_PX;
			const navH = keyboardOpen ? 0 : bottomNavHeight();
			setBox({ height: Math.max(0, vv.height - navH), top: vv.offsetTop });
		};
		update();
		vv.addEventListener("resize", update);
		vv.addEventListener("scroll", update);
		// Don't let the page behind the chat scroll on iPhone.
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			vv.removeEventListener("resize", update);
			vv.removeEventListener("scroll", update);
			document.body.style.overflow = prevOverflow;
		};
	}, [active]);
	return box;
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
	const apiRole: "citizen" | "beekeeper" = role === "beekeeper" ? "beekeeper" : "citizen";
	const mySenderRole = apiRole === "citizen" ? "Citizen" : "Beekeeper";

	const [users, setUsers] = useState<ChatUser[]>([]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	// The scrolling message area that's on screen (desktop panel or phone).
	const scrollRef = useRef<HTMLDivElement>(null);
	const setScrollEl = useCallback((el: HTMLDivElement | null) => {
		if (el) scrollRef.current = el;
	}, []);

	// Older messages (scroll-up loading)
	const [hasOlder, setHasOlder] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [loadingFirst, setLoadingFirst] = useState(false);
	const loadingOlderRef = useRef(false);

	// For the chat sound: last message seen per chat, and the newest
	// message id seen in the open chat.
	const lastPreviewRef = useRef<Map<number, string> | null>(null);
	const newestSeenRef = useRef<number | null>(null);

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
	const isDesktop = useIsLargeScreen();
	const showMobileChat = isDesktop === false && mobileSelected && Boolean(selectedUser);
	const viewport = useVisibleViewport(showMobileChat);

	const loadChats = useCallback(async () => {
		const res = await api.get<ChatUser[]>("/chats");
		if (res.success && res.data) {
			// Ding when another chat gets a new unread message.
			const prev = lastPreviewRef.current;
			const next = new Map<number, string>();
			let newIncoming = false;
			for (const u of res.data) {
				next.set(u.chat_id, u.message);
				if (prev && prev.get(u.chat_id) !== u.message && u.read === false) {
					newIncoming = true;
				}
			}
			if (newIncoming && !res.offline) playNotificationSound("chat");
			lastPreviewRef.current = next;
			setUsers(res.data);
		}
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
			const detail = (e as CustomEvent<{ deletedChatId?: number }>).detail;
			if (detail?.deletedChatId && detail.deletedChatId === selectedId) {
				closeChat();
			}
		};
		window.addEventListener(CHATS_CHANGED_EVENT, handleChanged);
		return () => window.removeEventListener(CHATS_CHANGED_EVENT, handleChanged);
	}, [loadChats, selectedId, closeChat]);

	// ── "Location" clicked in the + menu ────────────────
	useEffect(() => {
		const openLocationModal = () => {
			setLocationError(null);
			setLocationModalOpen(true);
		};
		window.addEventListener(SHARE_LOCATION_EVENT, openLocationModal);
		return () => window.removeEventListener(SHARE_LOCATION_EVENT, openLocationModal);
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

	const scrollToLatest = useCallback(() => {
		// The message area is flex-col-reverse: scrollTop 0 = the bottom.
		const el = scrollRef.current;
		if (el) el.scrollTop = 0;
	}, []);

	// ── Load + poll the LATEST messages for the selected chat ──
	// Polling is also what moves the other person's live pin.
	useEffect(() => {
		setMessages([]);
		setHasOlder(false);
		newestSeenRef.current = null;
		if (!selectedId) return;

		let cancelled = false;
		let inFlight = false;
		let first = true;
		setLoadingFirst(true);

		const loadLatest = async () => {
			if (inFlight) return; // slow server: don't stack requests
			inFlight = true;
			try {
				const res = await api.get<ChatMessage[]>(
					`/chats/${selectedId}/messages?limit=${PAGE_SIZE}`,
				);
				if (cancelled) return;
				if (res.success && res.data) {
					const latest = [...res.data].sort(byId);

					// Chat sound: a new message from the other person.
					const newest = latest[latest.length - 1]?.message_id ?? 0;
					if (newestSeenRef.current !== null && !res.offline) {
						const seen = newestSeenRef.current;
						const incoming = latest.some(
							(m) => m.message_id > seen && m.sender_role !== mySenderRole,
						);
						if (incoming) playNotificationSound("chat");
					}
					newestSeenRef.current = Math.max(newestSeenRef.current ?? 0, newest);

					setMessages((prev) => mergeLatest(prev, latest));
					if (first) {
						first = false;
						setHasOlder(latest.length >= PAGE_SIZE);
						setLoadingFirst(false);
						requestAnimationFrame(scrollToLatest);
					}
				} else if (!res.offline && !res.network_error) {
					// Chat no longer exists (e.g. just deleted) — drop the
					// dead selection instead of polling a 403/404 forever.
					closeChat();
				}
			} finally {
				inFlight = false;
				if (!cancelled && first) setLoadingFirst(false);
			}
		};

		loadLatest();
		const interval = setInterval(loadLatest, MESSAGE_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [selectedId, closeChat, mySenderRole, scrollToLatest]);

	// ── Older messages when scrolled to the top ─────────
	const loadOlder = useCallback(async () => {
		if (!selectedId || loadingOlderRef.current || !hasOlder) return;
		const oldest = messages.find((m) => !m.client_status);
		if (!oldest) return;
		loadingOlderRef.current = true;
		setLoadingOlder(true);
		const chatAtStart = selectedId;
		try {
			const res = await api.get<ChatMessage[]>(
				`/chats/${chatAtStart}/messages?limit=${PAGE_SIZE}&before=${oldest.message_id}`,
			);
			if (res.success && res.data && chatAtStart === selectedId) {
				const older = [...res.data].sort(byId);
				setMessages((prev) => {
					const have = new Set(prev.map((m) => m.message_id));
					return [...older.filter((m) => !have.has(m.message_id)), ...prev];
				});
				setHasOlder(older.length >= PAGE_SIZE);
			}
		} finally {
			loadingOlderRef.current = false;
			setLoadingOlder(false);
		}
	}, [selectedId, hasOlder, messages]);

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const el = e.currentTarget;
		// In a reversed list scrollTop is 0 at the bottom and negative
		// going up, so "distance from the top" is:
		const fromTop = el.scrollHeight - el.clientHeight - Math.abs(el.scrollTop);
		if (fromTop < LOAD_OLDER_AT_PX) loadOlder();
	};

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
				api.post(`/chats/messages/${id}/location`, { latitude, longitude });
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

	// Shows the message right away, then swaps in the saved one.
	const sendText = async (content: string, tempId: number) => {
		if (!selectedId) return;
		const chatAtStart = selectedId;
		const res = await api.post<ChatMessage>(`/chats/${chatAtStart}/messages`, { content });
		if (chatAtStart !== selectedId) return;
		if (res.success && res.data) {
			const saved = res.data as ChatMessage;
			newestSeenRef.current = Math.max(newestSeenRef.current ?? 0, saved.message_id);
			setMessages((prev) => {
				const withoutTemp = prev.filter((m) => m.message_id !== tempId);
				// A poll may already have brought it in.
				if (withoutTemp.some((m) => m.message_id === saved.message_id)) return withoutTemp;
				const savedOnes = withoutTemp.filter((m) => !m.client_status);
				const local = withoutTemp.filter((m) => m.client_status);
				return [...savedOnes, saved].sort(byId).concat(local);
			});
			loadChats();
		} else {
			setMessages((prev) =>
				prev.map((m) =>
					m.message_id === tempId ? { ...m, client_status: "failed" } : m,
				),
			);
		}
	};

	const handleSend = () => {
		const content = draft.trim();
		if (!content || !selectedId) return;
		setDraft("");
		const tempId = tempIdSeq.n--;
		const temp: ChatMessage = {
			message_id: tempId,
			chat_id: selectedId,
			sender_role: mySenderRole,
			content,
			is_read: false,
			sent_at: new Date().toISOString(),
			message_type: "text",
			image_url: null,
			latitude: null,
			longitude: null,
			live_share: false,
			is_live: false,
			live_seconds_left: 0,
			location_age_seconds: null,
			client_status: "sending",
		};
		setMessages((prev) => [...prev, temp]);
		requestAnimationFrame(scrollToLatest);
		sendText(content, tempId);
	};

	const handleRetry = (msg: ChatMessage) => {
		setMessages((prev) =>
			prev.map((m) =>
				m.message_id === msg.message_id ? { ...m, client_status: "sending" } : m,
			),
		);
		sendText(msg.content, msg.message_id);
	};

	const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
			const res = await api.post<ChatMessage>(`/chats/${selectedId}/images`, { image });
			if (res.success && res.data) {
				const saved = res.data as ChatMessage;
				newestSeenRef.current = Math.max(newestSeenRef.current ?? 0, saved.message_id);
				setMessages((prev) =>
					prev.some((m) => m.message_id === saved.message_id)
						? prev
						: [...prev.filter((m) => !m.client_status), saved]
								.sort(byId)
								.concat(prev.filter((m) => m.client_status)),
				);
				requestAnimationFrame(scrollToLatest);
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
			const res = await api.post<ChatMessage>(`/chats/${selectedId}/location`, {
				latitude: pos.coords.latitude,
				longitude: pos.coords.longitude,
				live_minutes: liveMinutes,
			});
			if (res.success && res.data) {
				const sent = res.data as ChatMessage;
				newestSeenRef.current = Math.max(newestSeenRef.current ?? 0, sent.message_id);
				requestAnimationFrame(scrollToLatest);
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
				setLocationError(res.message || "Couldn't share your location.");
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
	const renderConversation = () =>
		activeConversation.map((entry) =>
			entry.type === "date" ? (
				<DateTimeMessage key={entry.key} date={entry.date} />
			) : (
				<BubbleChat
					key={entry.key}
					sender={entry.sender}
					messages={entry.messages}
					onStopLive={handleStopLive}
					onRetry={handleRetry}
				/>
			),
		);

	// The scrolling message area (same for desktop and phone).
	// flex-col-reverse keeps it pinned to the newest message; the inner
	// div keeps the messages in normal top-to-bottom order.
	const renderMessageArea = () => (
		<div
			ref={setScrollEl}
			onScroll={handleScroll}
			className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col-reverse lg:scrollbar-auto scrollbar-none overscroll-contain">
			<div className="flex flex-col gap-2 p-3">
				{hasOlder && (
					<div className="w-full flex justify-center py-1">
						{loadingOlder ? (
							<Icon
								icon="svg-spinners:ring-resize"
								className="w-5 h-5 text-[#ffa004]"
							/>
						) : (
							<button
								type="button"
								onClick={loadOlder}
								className="text-xs text-[#817b70] underline">
								Load older messages
							</button>
						)}
					</div>
				)}
				{loadingFirst && messages.length === 0 && (
					<div className="w-full flex justify-center py-6">
						<Icon
							icon="svg-spinners:ring-resize"
							className="w-6 h-6 text-[#ffa004]"
						/>
					</div>
				)}
				{renderConversation()}
			</div>
		</div>
	);

	// Message box (same for desktop and phone).
	const renderComposer = () => (
		<div className="w-full p-2 mb-3 flex flex-row items-center gap-1 shrink-0">
			<ChatOptionMenu />
			<textarea
				placeholder="Message..."
				value={draft}
				rows={1}
				enterKeyHint="send"
				onChange={(e) => setDraft(e.target.value)}
				onFocus={() => {
					// Keyboard opening -> keep the latest message in view.
					setTimeout(scrollToLatest, 300);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						handleSend();
					}
				}}
				className="rounded-full bg-[#d9d9d9] resize-none h-8 w-full px-3 pt-1.5 text-sm outline-none"
			/>
			<button
				type="button"
				// Keep the keyboard open when tapping Send on a phone.
				onMouseDown={(e) => e.preventDefault()}
				onClick={handleSend}
				className="w-10 h-10">
				<Icon icon="basil:send-solid" className="w-10 h-10 text-[#ffdb4f]" />
			</button>
		</div>
	);

	// "Sending photo…" / error line shown just above the message box.
	const composerStatus =
		sendingImage || composerError ? (
			<div className="px-3 -mb-1 text-xs shrink-0">
				{sendingImage ? (
					<span className="flex items-center gap-1.5 text-[#817b70]">
						<Icon icon="svg-spinners:ring-resize" className="w-3.5 h-3.5" />
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
			{renderMessageArea()}

			{composerStatus}

			{/* INPUT MESSAGE */}
			{renderComposer()}
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
					{users.length === 0 && (
						<div className="text-center text-sm text-[#a6a3a3] py-4">
							No conversations yet.
						</div>
					)}
					{users.map((u) => (
						<div key={u.chat_id} onClick={() => handleSelectUser(u)}>
							<UserMessageCard
								chatId={u.chat_id}
								active={u.active}
								read={u.read}
								name={u.name}
								location={u.location}
								message={u.message}
								onMarkUnread={() => handleMarkUnread(u.chat_id)}
							/>
						</div>
					))}
				</div>
			</Container>

			{/* RIGHT SIDE — desktop: always visible inline */}
			<div className="hidden lg:flex flex-col flex-1 w-full min-h-0 h-full">
				{selectedUser && isDesktop ? (
					conversationView
				) : (
					<div className="flex-1 flex items-center justify-center text-[#a6a3a3]">
						Select a conversation to start chatting.
					</div>
				)}
			</div>

			{/* RIGHT SIDE — phone: full screen, sized to the part of the
			    screen above the keyboard so typing never hides the chat. */}
			{showMobileChat && selectedUser && (
				<div
					className="lg:hidden fixed inset-x-0 z-5000 bg-white flex flex-col"
					style={
						viewport
							? { top: viewport.top, height: viewport.height }
							: { top: 0, bottom: 0 }
					}>
					{/* BACK BUTTON */}
					<div className="bg-[#ffdb4f] w-full flex items-center gap-3 p-2 shrink-0">
						<button onClick={closeChat} className="flex items-center shrink-0">
							<Icon icon="bx:arrow-back" className="text-2xl text-[#4a2f00]" />
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
					{renderMessageArea()}

					{composerStatus}

					{/* INPUT MESSAGE */}
					{renderComposer()}
				</div>
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