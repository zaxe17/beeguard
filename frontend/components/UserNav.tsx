"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import user_profile from "@/public/assets/user_profile.png";
import { Icon } from "@iconify/react";
import Notification from "./popup/Notification";
import { notificationService } from "@/services/notification";
import { ProfilePhoto } from "./ProfilePhoto";
import { useAuth } from "@/context/AuthContext";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryParamState } from "@/hooks/useQueryParamState";
import {
	PUSH_MESSAGE_EVENT,
	enablePush,
	getPushState,
	pushSupported,
	syncPush,
	warmUpPush,
	type PushState,
} from "@/services/push";

function getDisplayName(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	return parts.slice(0, 2).join(" ");
}

const NOTIF_PARAM = "notif";
const NOTIF_OPEN_VALUE = "open";
// Re-check the bell badge so new notifications (new rescue offers,
// resolved rescues, nearby reports…) show up without a page reload.
const UNREAD_POLL_MS = 30000;
// This device is re-saved for the logged-in account once per visit.
let pushSyncedFor: string | null = null;

export const UserNav = () => {
	const { user } = useAuth();
	const [isOpen, setIsOpen] = useState(false); // desktop dropdown lang
	const [unreadCount, setUnreadCount] = useState(0);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const isDesktop = useIsDesktop();
	// Push notifications for this device ("off" shows the Turn on button).
	const [pushState, setPushState] = useState<PushState | null>(null);
	const [pushBusy, setPushBusy] = useState(false);
	const [pushMsg, setPushMsg] = useState<string | null>(null);

	const {
		value: notifParam,
		setValue: openNotifParam,
		clearValue: closeNotifParam,
	} = useQueryParamState(NOTIF_PARAM);

	const isMobileNotifOpen = notifParam === NOTIF_OPEN_VALUE;
	const isNotificationVisible = isDesktop ? isOpen : isMobileNotifOpen;

	const refreshUnreadCount = useCallback(async () => {
		const res = await notificationService.unreadCount();
		if (res.success && res.data) setUnreadCount(res.data.count);
	}, []);

	useEffect(() => {
		refreshUnreadCount();
		const interval = setInterval(refreshUnreadCount, UNREAD_POLL_MS);
		return () => clearInterval(interval);
	}, [refreshUnreadCount]);

	// Push: check this device; if permission was already given, make sure
	// it's saved for whoever is logged in now (no prompt).
	useEffect(() => {
		if (!user || !pushSupported()) return;
		warmUpPush(); // so "Turn on alerts" is quick when tapped
		let cancelled = false;
		(async () => {
			if (pushSyncedFor !== `${user.role}:${user.id}`) {
				pushSyncedFor = `${user.role}:${user.id}`;
				await syncPush();
			}
			const state = await getPushState();
			if (!cancelled) setPushState(state);
		})();
		return () => {
			cancelled = true;
		};
	}, [user]);

	// A push arrived while BeeGuard is open -> update the bell badge now.
	useEffect(() => {
		if (!pushSupported()) return;
		const onMessage = (e: MessageEvent) => {
			if (e.data?.type === PUSH_MESSAGE_EVENT) refreshUnreadCount();
		};
		navigator.serviceWorker.addEventListener("message", onMessage);
		return () => navigator.serviceWorker.removeEventListener("message", onMessage);
	}, [refreshUnreadCount]);

	// Hide the "turned on" / error note after a few seconds.
	useEffect(() => {
		if (!pushMsg) return;
		const t = setTimeout(() => setPushMsg(null), 5000);
		return () => clearTimeout(t);
	}, [pushMsg]);

	const handleEnablePush = async () => {
		setPushBusy(true);
		const res = await enablePush();
		setPushBusy(false);
		setPushState(res.state);
		setPushMsg(res.ok ? "Notifications are on for this device." : (res.message ?? null));
	};

	useEffect(() => {
		if (!isDesktop) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [isDesktop]);

	const displayName = user?.name ? getDisplayName(user.name) : "";

	const location = usePathname();
	const messagesRoute = location.startsWith("/citizen")
		? "/citizen"
		: location.startsWith("/beekeeper")
			? "/beekeeper"
			: "/admin";

	const handleBellClick = () => {
		if (isDesktop) {
			setIsOpen((prev) => !prev);
			return;
		}
		openNotifParam(NOTIF_OPEN_VALUE);
	};

	const handleNotificationClose = () => {
		if (isDesktop) {
			setIsOpen(false);
			return;
		}
		closeNotifParam();
	};

	return (
		<div className="sticky top-0 w-full flex items-start justify-between lg:p-0 px-5 pt-5 z-9999">
			<div className="flex items-center lg:gap-3.5 gap-1">
				<div className="border border-amber-100 lg:w-16 w-10 lg:h-16 h-10 rounded-full">
					<ProfilePhoto me />
				</div>

				<div className="">
					<h3 className="Poppins-Bold lg:text-3xl text-base">
						Hi, {displayName}! 👋
					</h3>
					<p className="text-[#817b70] lg:text-sm text-[10px] leading-3">
						Let’s protect the bees together.
					</p>
				</div>
			</div>

			<div className="flex items-center gap-3 relative" ref={wrapperRef}>
				{/* TURN ON PUSH NOTIFICATIONS (this device isn't subscribed yet) */}
				{pushState === "off" && (
					<button
						type="button"
						onClick={handleEnablePush}
						disabled={pushBusy}
						title="Get notified even when BeeGuard is closed"
						className="Poppins-SemiBold flex items-center gap-1 text-xs text-[#704500] bg-[#ffdb4f]/60 hover:bg-[#ffdb4f] rounded-full lg:px-3 px-2 py-1.5 transition-colors disabled:opacity-60">
						<Icon icon="mdi:bell-plus" className="w-4 h-4" />
						<span className="lg:inline hidden">
							{pushBusy ? "Turning on…" : "Turn on alerts"}
						</span>
					</button>
				)}
				{pushMsg && (
					<span className="absolute top-full right-0 mt-1 w-56 text-[11px] bg-white border border-[#e2e2e6] rounded-md p-2 shadow text-[#4a2f00] z-50">
						{pushMsg}
					</span>
				)}

				<div className="relative">
					{unreadCount > 0 && (
						<span className="absolute right-0 bg-red-500 border-2 border-white w-4 h-4 rounded-full text-[8px] text-white flex justify-center items-center">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					)}
					<div
						onClick={handleBellClick}
						className="lg:w-10 w-8 lg:h-10 h-8">
						<Icon
							icon="mdi:notifications"
							className="w-full h-full text-[#ffdb4f] cursor-pointer"
						/>
					</div>

					{isNotificationVisible && (
						<Notification
							onNotificationRead={refreshUnreadCount}
							onClose={handleNotificationClose}
						/>
					)}
				</div>

				<Link
					href={`${messagesRoute}/messages`}
					className="lg:w-10 w-8 lg:h-10 h-8">
					<Icon
						icon="flowbite:messages-solid"
						className="w-full h-full text-[#ffdb4f] cursor-pointer"
					/>
				</Link>
			</div>
		</div>
	);
};