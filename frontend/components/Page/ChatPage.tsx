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
import { playNotificationSound } from "@/lib/notifySound";
import {
	ChatMessagesSkeleton,
	UserMessageCardSkeleton,
} from "@/components/loading/SkeletonLoading";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type ChatUser = {
	chat_id: number;
	name: string;
	location: string;
	message: string;
	active?: boolean;
	read?: boolean;
};

type ChatEntry =
	| {
			type: "bubble";
			sender: "user" | "client";
			messages: ChatMessage[];
			key: string;
	  }
	| {
			type: "date";
			key: string;
			date: string;
	  };

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const MESSAGE_POLL_MS = 4000;
const LIST_POLL_MS = 8000;
const PAGE_SIZE = 30;
const LOAD_OLDER_AT_PX = 120;
const LIVE_UPDATE_MS = 10000;

const CHATS_CHANGED_EVENT = "beeguard:chats-changed";
const SHARE_LOCATION_EVENT = "beeguard:share-location";
const PICK_IMAGE_EVENT = "beeguard:pick-image";

const IMAGE_MAX_SIDE = 1600;
const IMAGE_QUALITY = 0.82;
const IMAGE_PICK_MAX_BYTES = 20 * 1024 * 1024;

const KEYBOARD_MIN_PX = 120;

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

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
			entries.push({
				type: "date",
				key: `date-${m.message_id}`,
				date: m.sent_at,
			});
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

const byId = (a: ChatMessage, b: ChatMessage) => a.message_id - b.message_id;

const mergeLatest = (
	prev: ChatMessage[],
	latest: ChatMessage[],
): ChatMessage[] => {
	const local = prev.filter((m) => m.client_status);
	const saved = prev.filter((m) => !m.client_status);

	if (latest.length === 0) {
		return [...local];
	}

	const oldestInPage = latest[0].message_id;
	const kept = saved.filter((m) => m.message_id < oldestInPage);

	return [...kept, ...latest].sort(byId).concat(local);
};

const tempIdSeq = { n: -1 };

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

	if (code === 3) {
		return "Getting your location took too long. Try again.";
	}

	return "Couldn't get your location. Try again.";
};

/* -------------------------------------------------------------------------- */
/*                                   Hooks                                    */
/* -------------------------------------------------------------------------- */

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

/**
 * Mobile viewport
 *
 * We do NOT subtract the bottom navigation anymore — the MobileOverlay
 * itself is responsible for sitting above the app navigation.
 *
 * When the keyboard opens, visualViewport.height becomes smaller and is
 * already the visible area above the keyboard.
 */
const useVisibleViewport = (active: boolean) => {
	const [box, setBox] = useState<{ height: number; top: number } | null>(
		null,
	);

	useEffect(() => {
		if (
			!active ||
			typeof window === "undefined" ||
			!window.visualViewport
		) {
			setBox(null);
			return;
		}

		const vv = window.visualViewport;

		const update = () => {
			const keyboardOpen =
				window.innerHeight - vv.height > KEYBOARD_MIN_PX;

			setBox({
				top: keyboardOpen ? vv.offsetTop : 0,
				height: keyboardOpen ? vv.height : window.innerHeight,
			});
		};

		update();
		vv.addEventListener("resize", update);
		vv.addEventListener("scroll", update);

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			vv.removeEventListener("resize", update);
			vv.removeEventListener("scroll", update);
			document.body.style.overflow = previousOverflow;
		};
	}, [active]);

	return box;
};

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

const ChatPage = () => {
	const pathname = usePathname();
	const role = pathname.split("/")[1] as "citizen" | "beekeeper";
	const apiRole: "citizen" | "beekeeper" =
		role === "beekeeper" ? "beekeeper" : "citizen";
	const mySenderRole = apiRole === "citizen" ? "Citizen" : "Beekeeper";

	/* ------------------------------- State -------------------------------- */

	const [users, setUsers] = useState<ChatUser[]>([]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");

	const [chatsLoading, setChatsLoading] = useState(true);
	const [loadingFirst, setLoadingFirst] = useState(false);
	const [hasOlder, setHasOlder] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);

	const [sendingImage, setSendingImage] = useState(false);
	const [composerError, setComposerError] = useState<string | null>(null);

	const [locationModalOpen, setLocationModalOpen] = useState(false);
	const [locationBusy, setLocationBusy] = useState(false);
	const [locationError, setLocationError] = useState<string | null>(null);

	/* -------------------------------- Refs -------------------------------- */

	const scrollRef = useRef<HTMLDivElement>(null);
	const loadingOlderRef = useRef(false);
	const lastPreviewRef = useRef<Map<number, string> | null>(null);
	const newestSeenRef = useRef<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const setScrollEl = useCallback((el: HTMLDivElement | null) => {
		if (el) {
			scrollRef.current = el;
		}
	}, []);

	/* ----------------------------- Selection ------------------------------ */

	const {
		value: selectedIdParam,
		setValue: setChatParam,
		clearValue: closeChat,
	} = useQueryParamState("chat");

	const selectedId = selectedIdParam ? Number(selectedIdParam) : null;
	const selectedUser = users.find((u) => u.chat_id === selectedId) ?? null;
	const mobileSelected = Boolean(selectedId);

	const isDesktop = useIsLargeScreen();
	const showMobileChat =
		isDesktop === false && mobileSelected && Boolean(selectedUser);
	const viewport = useVisibleViewport(showMobileChat);

	/* ----------------------------- Chat list ------------------------------ */

	const loadChats = useCallback(async () => {
		const res = await api.get<ChatUser[]>("/chats");

		if (res.success && res.data) {
			const prev = lastPreviewRef.current;
			const next = new Map<number, string>();
			let newIncoming = false;

			for (const u of res.data) {
				next.set(u.chat_id, u.message);

				if (
					prev &&
					prev.get(u.chat_id) !== u.message &&
					u.read === false
				) {
					newIncoming = true;
				}
			}

			if (newIncoming && !res.offline) {
				playNotificationSound("chat");
			}

			lastPreviewRef.current = next;
			setUsers(res.data);
		}

		setChatsLoading(false);
	}, []);

	useEffect(() => {
		loadChats();
		const interval = setInterval(loadChats, LIST_POLL_MS);

		return () => clearInterval(interval);
	}, [loadChats]);

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

	/* ---------------------------- Menu events ----------------------------- */

	useEffect(() => {
		const openLocationModal = () => {
			setLocationError(null);
			setLocationModalOpen(true);
		};

		window.addEventListener(SHARE_LOCATION_EVENT, openLocationModal);

		return () =>
			window.removeEventListener(SHARE_LOCATION_EVENT, openLocationModal);
	}, []);

	useEffect(() => {
		const openPicker = () => {
			setComposerError(null);
			fileInputRef.current?.click();
		};

		window.addEventListener(PICK_IMAGE_EVENT, openPicker);

		return () => window.removeEventListener(PICK_IMAGE_EVENT, openPicker);
	}, []);

	useEffect(() => {
		setComposerError(null);
	}, [selectedId]);

	/* ------------------------------ Messages ------------------------------ */

	const scrollToLatest = useCallback(() => {
		const el = scrollRef.current;
		if (el) {
			el.scrollTop = 0;
		}
	}, []);

	useEffect(() => {
		setMessages([]);
		setHasOlder(false);
		newestSeenRef.current = null;

		if (!selectedId) {
			setLoadingFirst(false);
			return;
		}

		let cancelled = false;
		let inFlight = false;
		let first = true;

		setLoadingFirst(true);

		const loadLatest = async () => {
			if (inFlight) return;
			inFlight = true;

			try {
				const res = await api.get<ChatMessage[]>(
					`/chats/${selectedId}/messages?limit=${PAGE_SIZE}`,
				);

				if (cancelled) return;

				if (res.success && res.data) {
					const latest = [...res.data].sort(byId);
					const newest = latest[latest.length - 1]?.message_id ?? 0;

					if (newestSeenRef.current !== null && !res.offline) {
						const seen = newestSeenRef.current;
						const incoming = latest.some(
							(m) =>
								m.message_id > seen &&
								m.sender_role !== mySenderRole,
						);

						if (incoming) {
							playNotificationSound("chat");
						}
					}

					newestSeenRef.current = Math.max(
						newestSeenRef.current ?? 0,
						newest,
					);

					setMessages((prev) => mergeLatest(prev, latest));

					if (first) {
						first = false;
						setHasOlder(latest.length >= PAGE_SIZE);
						setLoadingFirst(false);
						requestAnimationFrame(scrollToLatest);
					}
				} else if (!res.offline && !res.network_error) {
					closeChat();
				}
			} finally {
				inFlight = false;

				if (!cancelled && first) {
					setLoadingFirst(false);
				}
			}
		};

		loadLatest();
		const interval = setInterval(loadLatest, MESSAGE_POLL_MS);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [selectedId, closeChat, mySenderRole, scrollToLatest]);

	const loadOlder = useCallback(async () => {
		if (!selectedId || loadingOlderRef.current || !hasOlder) {
			return;
		}

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
					return [
						...older.filter((m) => !have.has(m.message_id)),
						...prev,
					];
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
		const fromTop =
			el.scrollHeight - el.clientHeight - Math.abs(el.scrollTop);

		if (fromTop < LOAD_OLDER_AT_PX) {
			loadOlder();
		}
	};

	/* --------------------------- Live location ---------------------------- */

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
			() => {},
			{
				enableHighAccuracy: true,
				maximumAge: 10000,
				timeout: 20000,
			},
		);

		const interval = setInterval(push, LIVE_UPDATE_MS);

		return () => {
			navigator.geolocation.clearWatch(watchId);
			clearInterval(interval);
		};
	}, [myLiveIdsKey]);

	/* ------------------------------ Handlers ------------------------------ */

	const handleSelectUser = (user: ChatUser) => {
		setChatParam(String(user.chat_id));
	};

	const sendText = async (content: string, tempId: number) => {
		if (!selectedId) return;

		const chatAtStart = selectedId;

		const res = await api.post<ChatMessage>(
			`/chats/${chatAtStart}/messages`,
			{
				content,
			},
		);

		if (chatAtStart !== selectedId) {
			return;
		}

		if (res.success && res.data) {
			const saved = res.data as ChatMessage;

			newestSeenRef.current = Math.max(
				newestSeenRef.current ?? 0,
				saved.message_id,
			);

			setMessages((prev) => {
				const withoutTemp = prev.filter((m) => m.message_id !== tempId);

				if (
					withoutTemp.some((m) => m.message_id === saved.message_id)
				) {
					return withoutTemp;
				}

				const savedOnes = withoutTemp.filter((m) => !m.client_status);
				const local = withoutTemp.filter((m) => m.client_status);

				return [...savedOnes, saved].sort(byId).concat(local);
			});

			loadChats();
		} else {
			setMessages((prev) =>
				prev.map((m) =>
					m.message_id === tempId
						? { ...m, client_status: "failed" }
						: m,
				),
			);
		}
	};

	const handleSend = () => {
		const content = draft.trim();

		if (!content || !selectedId) {
			return;
		}

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
				m.message_id === msg.message_id
					? { ...m, client_status: "sending" }
					: m,
			),
		);

		sendText(msg.content, msg.message_id);
	};

	const handleImageSelected = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		e.target.value = "";

		if (!file || !selectedId || sendingImage) {
			return;
		}

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
				{
					image,
				},
			);

			if (res.success && res.data) {
				const saved = res.data as ChatMessage;

				newestSeenRef.current = Math.max(
					newestSeenRef.current ?? 0,
					saved.message_id,
				);

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
		if (chatId === selectedId) {
			closeChat();
		}

		setUsers((prev) =>
			prev.map((u) => (u.chat_id === chatId ? { ...u, read: false } : u)),
		);

		const res = await api.post(`/chats/${chatId}/unread`, {});
		if (!res.success) loadChats();
	};

	const handleShareLocation = async (liveMinutes: number) => {
		if (!selectedId || locationBusy) {
			return;
		}

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

				newestSeenRef.current = Math.max(
					newestSeenRef.current ?? 0,
					sent.message_id,
				);

				requestAnimationFrame(scrollToLatest);

				setMessages((prev) => [
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
		setMessages((prev) =>
			prev.map((m) =>
				m.message_id === messageId
					? { ...m, is_live: false, live_seconds_left: 0 }
					: m,
			),
		);

		await api.post(`/chats/messages/${messageId}/location/stop`, {});
	};

	/* ------------------------------ Render -------------------------------- */

	const activeConversation = buildEntries(messages, apiRole);

	const renderConversation = () =>
		loadingFirst && messages.length === 0 ? (
			<ChatMessagesSkeleton />
		) : (
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
			)
		);

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

				{renderConversation()}
			</div>
		</div>
	);

	const renderComposer = () => (
		<div className="w-full px-2 py-2 flex flex-row items-center gap-1 shrink-0 bg-white">
			<ChatOptionMenu />

			<textarea
				placeholder="Message..."
				value={draft}
				rows={1}
				enterKeyHint="send"
				onChange={(e) => setDraft(e.target.value)}
				onFocus={() => setTimeout(scrollToLatest, 300)}
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
				onMouseDown={(e) => e.preventDefault()}
				onClick={handleSend}
				className="w-10 h-10 shrink-0">
				<Icon
					icon="basil:send-solid"
					className="w-10 h-10 text-[#ffdb4f]"
				/>
			</button>
		</div>
	);

	const composerStatus =
		sendingImage || composerError ? (
			<div className="px-3 py-1 text-xs shrink-0 bg-white">
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

	const conversationView = (
		<>
			<div className="flex items-center bg-[#ffdb4f] p-2 gap-3 shrink-0">
				<div className="relative">
					<div className="relative w-10 h-10">
						<ProfilePhoto />
					</div>
					<div className="absolute bottom-0 right-0 bg-[#8ac44f] w-4 h-4 rounded-full border-2 border-white" />
				</div>

				<h3 className="text-base">{selectedUser?.name}</h3>
			</div>

			{renderMessageArea()}
			{composerStatus}
			{renderComposer()}
		</>
	);

	return (
		<div className="w-full h-full flex items-start lg:flex-row flex-col relative">
			{/* LEFT SIDE — chat list */}
			<Container
				borderNone
				className="lg:w-[30%] w-full flex-1 lg:flex-none lg:h-full">
				<div className="relative w-full px-2 flex flex-col items-center gap-4">
					<h3 className="relative Poppins-SemiBold text-xl text-[#020101]">
						Messages
					</h3>
					<SearchBar placeholder="Search Messages" />
				</div>

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

			{/* DESKTOP — conversation */}
			<div className="hidden lg:flex flex-col flex-1 w-full min-h-0 h-full">
				{selectedUser && isDesktop ? (
					conversationView
				) : selectedId && chatsLoading ? (
					<div className="flex-1 flex flex-col justify-end p-3">
						<ChatMessagesSkeleton />
					</div>
				) : (
					<div className="flex-1 flex items-center justify-center text-[#a6a3a3]">
						Select a conversation to start chatting.
					</div>
				)}
			</div>

			{/* MOBILE — conversation overlay */}
			{showMobileChat && selectedUser && (
				<MobileOverlay>
					<div
						className="fixed inset-0 z-5000 bg-white flex flex-col overflow-hidden"
						style={
							viewport
								? {
										top: viewport.top,
										height: viewport.height,
										bottom: "auto",
									}
								: { top: 0, height: "100dvh", bottom: "auto" }
						}>
						{/* Header */}
						<div className="bg-[#ffdb4f] w-full flex items-center gap-3 p-2 shrink-0">
							<button
								type="button"
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
								<div className="absolute bottom-0 right-0 bg-[#8ac44f] w-4 h-4 rounded-full border-2 border-white" />
							</div>

							<h3 className="text-base">{selectedUser.name}</h3>
						</div>

						{renderMessageArea()}
						{composerStatus}
						{renderComposer()}
					</div>
				</MobileOverlay>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleImageSelected}
			/>

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
