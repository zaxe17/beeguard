"use client"

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import user_profile from "@/public/assets/user_profile.png";
import { Icon } from "@iconify/react";
import Notification from "../popup/Notification";
import { notificationService } from "@/services/notification";

export const UserNav = () => {
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

	return (
		<div className="w-full flex items-start justify-between">
			<div className="flex items-center gap-3.5">
				{/* USER PROFILE */}
				<div className="border border-amber-100 w-16 h-16 rounded-full">
					<Image
						src={user_profile}
						alt="user_profile"
						className="w-full h-full"
					/>
				</div>

				{/* USER NAME */}
				<div className="">
					<h3 className="Poppins-Bold text-3xl">Hi, Jan Marc! 👋</h3>
					<span className="text-[#817b70] text-sm">
						Let’s protect the bees together.
					</span>
				</div>
			</div>

			{/* 3 ACTION BUTTON [NOTIFICATION, MESSAGES] */}
			{/* NOTE: wrapperRef is now actually attached (below) — previously
			    it was declared but never assigned to any element, so
			    click-outside-to-close silently did nothing. */}
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
						className="w-10 h-10">
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
				<div className="w-10 h-10">
					<Icon
						icon="flowbite:messages-solid"
						className="w-full h-full text-[#ffdb4f] cursor-pointer"
					/>
				</div>
			</div>
		</div>
	);
};