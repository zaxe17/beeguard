"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { UserMessageCard, BubbleChat, DateTimeMessage } from "../ui/Chat";
import { Container } from "../ui/Container";
import { SearchBar } from "../ui/Input";
import { ProfilePhoto } from "../ProfilePhoto";
import MobileOverlay from "@/components/MobileOverlay";
import { useQueryParamState } from "@/hooks/useQueryParamState";
import { ChatOptionMenu } from "../popup/MessagePopup";

type ChatUser = {
	id: string;
	name: string;
	location: string;
	message: string;
	active?: boolean;
	read?: boolean;
};

type ChatBubble = {
	type: "bubble";
	sender: "user" | "client";
	messages: string[];
};

type ChatDateSeparator = {
	type: "date";
};

type ChatEntry = ChatBubble | ChatDateSeparator;

const initialUsers: ChatUser[] = [
	{
		id: "john-evans",
		name: "John Evans Gutierrez",
		location: "Moonwalk, Parañaque",
		message: "Pre, pwede pa pwet pwease po",
		active: true,
	},
	{
		id: "kelya",
		name: "Kelya Audrey S. Gamayo",
		location: "Novaliches, Quezon City",
		message: "grabe na deadline natin",
		active: true,
		read: true,
	},
	{
		id: "micka",
		name: "Micka Andrea Soriano",
		location: "Mandaluyong, Marikina City",
		message:
			"You: Putangina micka, pautang nga ako ng piso bayaran ko kapag may work na ako",
		read: true,
	},
];

// DUMP DATA — conversation history per user, keyed by user id
const conversations: Record<string, ChatEntry[]> = {
	"john-evans": [
		{
			type: "bubble",
			sender: "client",
			messages: [
				"di me makagawa maayos HAHAHAHAH buset gulong gulo utak",
			],
		},
		{ type: "date" },
		{
			type: "bubble",
			sender: "user",
			messages: [
				"Bkttt",
				"Sorry ibans sorry",
				"Pumapasok ba ako sa isip mo",
			],
		},
		{
			type: "bubble",
			sender: "client",
			messages: ["baliw", "HAHAAHAHHAH"],
		},
		{
			type: "bubble",
			sender: "client",
			messages: ["Pre, pwede pa pwet pwease po"],
		},
	],
	kelya: [
		{
			type: "bubble",
			sender: "client",
			messages: [
				"hoy macmac",
				"bilisan mo pag gawa ng frontend",
				"nagagalit na si evans",
			],
		},
		{ type: "date" },
		{
			type: "bubble",
			sender: "user",
			messages: ["oo na oo na", "ginagawa ko na"],
		},
		{
			type: "bubble",
			sender: "client",
			messages: ["sana all", "grabe na deadline natin"],
		},
	],
	micka: [
		{ type: "date" },
		{
			type: "bubble",
			sender: "user",
			messages: [
				"Putangina micka",
				"pautang nga ako ng piso",
				"bayaran ko kapag may work na ako",
			],
		},
	],
};

const ChatPage = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	// get segment after "/" — "citizen", "admin", o "beekeeper"
	const role = pathname.split("/")[1];

	const [users, setUsers] = useState<ChatUser[]>(initialUsers);

	const {
		value: selectedId,
		setValue: setChatParam,
		clearValue: closeChat,
	} = useQueryParamState("chat");

	const selectedUser = users.find((u) => u.id === selectedId) ?? null;
	const mobileSelected = Boolean(selectedId);
	const activeConversation = selectedId
		? (conversations[selectedId] ?? [])
		: [];

	const markAsRead = (userId: string) => {
		setUsers((prev) =>
			prev.map((u) => (u.id === userId ? { ...u, read: true } : u)),
		);
	};

	const markAsUnread = (userId: string) => {
		setUsers((prev) =>
			prev.map((u) => (u.id === userId ? { ...u, read: false } : u)),
		);
	};

	const handleSelectUser = (user: ChatUser) => {
		setChatParam(user.id);
		markAsRead(user.id);
	};

	const ConversationView = () => (
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
				<div className="overflow-y-auto overflow-x-hidden min-h-0 flex flex-col gap-2 p-3 lg:scrollbar-auto scrollbar-none">
					{activeConversation.map((entry, i) =>
						entry.type === "date" ? (
							<DateTimeMessage key={i} />
						) : (
							<BubbleChat
								key={i}
								sender={entry.sender}
								messages={entry.messages}
							/>
						),
					)}
				</div>
			</div>

			{/* INPUT MESSAGE */}
			<div className="w-full p-2 mb-3 flex flex-row items-center gap-1 shrink-0">
				<ChatOptionMenu />

				<textarea
					placeholder="Message..."
					className="rounded-full bg-[#d9d9d9] resize-none h-8 w-full px-3 pt-1.5 text-sm outline-none"
				/>
				<div className="w-8 h-8">
					<Icon
						icon="basil:send-solid"
						className="w-8 h-8 text-[#ffdb4f]"
					/>
				</div>
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
				<div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					{users.map((u) => (
						<div key={u.id} onClick={() => handleSelectUser(u)}>
							<UserMessageCard
								active={u.active}
								read={u.read}
								name={u.name}
								location={u.location}
								message={u.message}
								onMarkUnread={() => markAsUnread(u.id)}
							/>
						</div>
					))}
				</div>
			</Container>

			{/* RIGHT SIDE — desktop: always visible inline */}
			<div className="hidden lg:flex flex-col flex-1 w-full min-h-0 h-full">
				{selectedUser ? (
					<ConversationView />
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
							<div className="overflow-y-auto overflow-x-hidden min-h-0 flex flex-col gap-2 p-3 lg:scrollbar-auto scrollbar-none">
								{activeConversation.map((entry, i) =>
									entry.type === "date" ? (
										<DateTimeMessage key={i} />
									) : (
										<BubbleChat
											key={i}
											sender={entry.sender}
											messages={entry.messages}
										/>
									),
								)}
							</div>
						</div>

						{/* INPUT MESSAGE */}
						<div className="w-full p-2 mb-3 flex flex-row items-center gap-1 shrink-0">
							<ChatOptionMenu />
							<textarea
								placeholder="Message..."
								className="rounded-full bg-[#d9d9d9] resize-none h-8 w-full px-3 pt-1.5 text-sm outline-none"
							/>
							<div className="w-8 h-8">
								<Icon
									icon="basil:send-solid"
									className="w-8 h-8 text-[#ffdb4f]"
								/>
							</div>
						</div>
					</div>
				</MobileOverlay>
			)}
		</div>
	);
};

export default ChatPage;
