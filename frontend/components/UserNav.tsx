"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import user_profile from "@/public/assets/user_profile.png";
import { Icon } from "@iconify/react";
import Notification from "./popup/Notification";
import { notificationService } from "@/services/notification";
import { ProfilePhoto } from "./ProfilePhoto";
import { useAuth } from "@/context/AuthContext";

// Shows only the first two words of the logged-in user's full name
// (e.g. "John Evans Lacuas Gutierrez" -> "John Evans"). Falls back to
// just the first word when there's no second one (e.g. "Cher").
function getDisplayName(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	return parts.slice(0, 2).join(" ");
}

export const UserNav = () => {
	const { user } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const refreshUnreadCount = useCallback(async () => {
		const res = await notificationService.unreadCount();
		if (res.success && res.data) setUnreadCount(res.data.count);
	}, []);

	useEffect(() => {
		refreshUnreadCount();
	}, [refreshUnreadCount]);

	useEffect(() => {
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
	}, []);

	// `user` is null while AuthContext is still loading/refreshing —
	// falls back to an empty string for that brief moment rather than
	// showing a wrong/placeholder name.
	const displayName = user?.name ? getDisplayName(user.name) : "";

	return (
		<div className="sticky top-0 w-full flex lg:items-start items-center justify-between lg:p-0 px-5 pt-5">
			<div className="flex items-center lg:gap-3.5 gap-1">
				{/* USER PROFILE */}
				<div className="border border-amber-100 lg:w-16 w-12 lg:h-16 h-12 rounded-full">
					<ProfilePhoto />
				</div>

				{/* USER NAME */}
				<div className="">
					<h3 className="Poppins-Bold lg:text-3xl text-xl">
						Hi, {displayName}! 👋
					</h3>
					<p className="text-[#817b70] lg:text-sm text-xs leading-2">
						Let’s protect the bees together.
					</p>
				</div>
			</div>

			{/* 3 ACTION BUTTON [NOTIFICATION, MESSAGES] */}
			<div className="flex items-center gap-3" ref={wrapperRef}>
				{/* NOTIFICATION */}
				<div className="relative">
					{unreadCount > 0 && (
						<span className="absolute right-0 bg-red-500 border-2 border-white w-4 h-4 rounded-full text-[8px] text-white flex justify-center items-center">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					)}
					<div
						onClick={() => setIsOpen((prev) => !prev)}
						className="lg:w-10 w-8 lg:h-10 h-8">
						<Icon
							icon="mdi:notifications"
							className="w-full h-full text-[#ffdb4f] cursor-pointer"
						/>
					</div>

					{isOpen && (
						<Notification onNotificationRead={refreshUnreadCount} />
					)}
				</div>

				{/* MESSAGE */}
				<div className="lg:w-10 w-8 lg:h-10 h-8">
					<Icon
						icon="flowbite:messages-solid"
						className="w-full h-full text-[#ffdb4f] cursor-pointer"
					/>
				</div>
			</div>
		</div>
	);
};