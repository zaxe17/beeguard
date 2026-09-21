"use client";

import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	notificationService,
	NotificationRecord,
} from "@/services/notification";
import MobileOverlay from "@/components/MobileOverlay";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const typeStyle: Record<string, { icon: string; color: string }> = {
	pesticide_alert: {
		icon: "mingcute:alert-fill",
		color: "#ff0000",
	},
	queen_recommendation: {
		icon: "fluent:crown-24-filled",
		color: "#ffdb4f",
	},
};
const DEFAULT_STYLE = { icon: "mingcute:alert-fill", color: "#ff0000" };

function timeAgo(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diffMs / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

type NotifCardProps = {
	notif: NotificationRecord;
	onClick: (notif: NotificationRecord) => void;
};

const NotifCard = ({ notif, onClick }: NotifCardProps) => {
	const style = typeStyle[notif.notification_type] ?? DEFAULT_STYLE;

	return (
		<div
			onClick={() => onClick(notif)}
			className={`rounded-md p-2 text-sm flex justify-start items-start gap-3 hover:bg-[#fff1ad]/60 transition-all duration-130 ease-in cursor-pointer ${
				notif.is_read ? "opacity-60" : ""
			}`}>
			<div
				className="w-10 h-10 rounded-full p-1.5 flex justify-center items-center shrink-0"
				style={{ color: style.color, background: `${style.color}4D` }}>
				<Icon icon={style.icon} className="w-full h-full" />
			</div>

			{/* INFORMATION */}
			<div className="w-full flex flex-col text-xs">
				<div className="flex justify-between items-start gap-2">
					<h1 className="Poppins-Bold text-[#4A2F00] uppercase">
						{notif.title}
					</h1>
					{!notif.is_read && (
						<span className="w-2 h-2 rounded-full bg-[#ff9a00] shrink-0 mt-1" />
					)}
				</div>

				<span className="Poppins-SemiBold text-[#5a4e39] text-[10px] mt-1 normal-case">
					{notif.message}
				</span>

				<span className="text-[#a6a3a3] text-[10px] mt-1 normal-case">
					{timeAgo(notif.created_at)}
				</span>
			</div>
		</div>
	);
};

type NotificationProps = {
	onNotificationRead?: () => void;
	// Called kapag pinindot yung back button sa mobile overlay.
	// Ang parent (UserNav) ang bahala kung paano ito sasarhan
	// (sa mobile: aalisin yung "?notif=open" sa URL).
	onClose?: () => void;
};

// Shared logic + content — used by both desktop dropdown and mobile overlay
const useNotifications = (onNotificationRead?: () => void) => {
	const router = useRouter();
	const [notifs, setNotifs] = useState<NotificationRecord[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			setLoading(true);
			const res = await notificationService.list({ limit: 30 });
			if (cancelled) return;
			if (res.success && res.data) setNotifs(res.data);
			setLoading(false);
		};
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	const handleClick = async (notif: NotificationRecord) => {
		if (!notif.is_read) {
			setNotifs((prev) =>
				prev.map((n) =>
					n.notification_id === notif.notification_id
						? { ...n, is_read: true }
						: n,
				),
			);
			notificationService.markRead(notif.notification_id);
			onNotificationRead?.();
		}

		if (notif.notification_type === "pesticide_alert" && notif.alert_id) {
			router.push(`/beekeeper/alert/details?id=${notif.alert_id}`);
		}
	};

	const handleMarkAllRead = async () => {
		setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
		await notificationService.markAllRead();
		onNotificationRead?.();
	};

	const hasUnread = notifs.some((n) => !n.is_read);

	return { notifs, loading, hasUnread, handleClick, handleMarkAllRead };
};

const NotificationList = ({
	notifs,
	loading,
	handleClick,
}: {
	notifs: NotificationRecord[];
	loading: boolean;
	handleClick: (notif: NotificationRecord) => void;
}) => {
	if (loading) {
		return (
			<p className="text-center text-xs text-[#817b70] p-4">Loading…</p>
		);
	}
	if (notifs.length === 0) {
		return (
			<p className="text-center text-xs text-[#817b70] p-4">
				No notifications yet.
			</p>
		);
	}
	return (
		<>
			{notifs.map((n) => (
				<NotifCard
					key={n.notification_id}
					notif={n}
					onClick={handleClick}
				/>
			))}
		</>
	);
};

const Notification = ({ onNotificationRead, onClose }: NotificationProps) => {
	const isDesktop = useIsDesktop();
	const { notifs, loading, hasUnread, handleClick, handleMarkAllRead } =
		useNotifications(onNotificationRead);

	if (isDesktop) {
		return (
			<div
				className="absolute w-90 z-10 bg-white rounded-xl right-0 my-3 p-2 lg:flex hidden flex-col overflow-hidden scroll-container"
				style={{
					maxHeight: "calc(100vh - 100px)",
					boxShadow:
						"rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px",
				}}>
				<div className="flex justify-between items-center mb-3 px-2">
					<h2 className="Poppins-Bold text-2xl text-[#4A2F00]">
						Notification
					</h2>
					{hasUnread && (
						<span
							className="text-xs text-[#ffce1c] cursor-pointer"
							onClick={handleMarkAllRead}>
							mark all read
						</span>
					)}
				</div>

				<div className="flex flex-col gap-2 p-1.5 flex-1 min-h-0 scroll overflow-y-auto">
					<NotificationList
						notifs={notifs}
						loading={loading}
						handleClick={handleClick}
					/>
				</div>
			</div>
		);
	}

	// MOBILE — slide-up overlay
	return (
		<MobileOverlay>
			{/* BACK BUTTON */}
			<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6]">
				<button
					onClick={onClose}
					className="absolute flex items-center shrink-0">
					<Icon
						icon="bx:arrow-back"
						className="text-2xl text-[#ffa004]"
					/>
				</button>
				<span className="w-full Poppins-SemiBold text-sm text-[#4a2f00] text-center">
					Notification
				</span>
			</div>

			<div className="flex flex-col gap-2 p-3 w-full">
				{hasUnread && (
					<span
						className="text-xs text-[#ffce1c] cursor-pointer shrink-0"
						onClick={handleMarkAllRead}>
						mark all read
					</span>
				)}
				<NotificationList
					notifs={notifs}
					loading={loading}
					handleClick={handleClick}
				/>
			</div>
		</MobileOverlay>
	);
};

export default Notification;
