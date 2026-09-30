"use client";

import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
	notificationService,
	NotificationRecord,
} from "@/services/notification";
import MobileOverlay from "@/components/MobileOverlay";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useModal } from "@/context/ModalContext";
import { NotifCardSkeleton } from "../loading/SkeletonLoading";
import { PUSH_MESSAGE_EVENT, pushSupported } from "@/services/push";

// REALTIME (NEW) — while the notification list is open:
//   - the "just now / 5m ago / 1h ago" labels update by themselves
//     (every 30 s, so the minutes go up one by one, then the hours)
//     (before, they were worked out once and stayed "just now"), and
//   - new notifications appear without closing and reopening it
//     (re-checked every 15 s, and right away when a push arrives).
const TIME_LABEL_TICK_MS = 30000;
const LIST_REFRESH_MS = 15000;

// Opens the same Report Details modal the Report tab uses
// (<BeeReport /> in app/beekeeper/layout.tsx reads this payload).
type ModalType = "BeeReport";
type BeeReportPayload = { reportId: string };

const typeStyle: Record<string, { icon: string; color: string }> = {
	pesticide_alert: {
		icon: "mingcute:alert-fill",
		color: "#ff0000",
	},
	queen_recommendation: {
		icon: "fluent:crown-24-filled",
		color: "#ffdb4f",
	},
	// NEW — a citizen reported a swarm near this beekeeper's farm.
	rescue_report: {
		icon: "mdi:bee",
		color: "#ff9a00",
	},
	// NEW — citizen accepted / declined this beekeeper's offer, or
	// cancelled the report.
	offer_update: {
		icon: "mdi:handshake",
		color: "#1f6f5f",
	},
	// NEW (citizen) — a beekeeper offered to rescue their reported bees.
	rescue_offer: {
		icon: "mdi:hand-coin",
		color: "#ff9a00",
	},
	// NEW (both) — the rescue was marked done.
	rescue_resolved: {
		icon: "mdi:check-decagram",
		color: "#00cc00",
	},
	// NEW (beekeeper) — admin approved / rejected their verification.
	verification: {
		icon: "mdi:shield-check",
		color: "#38b6ff",
	},
	// NEW (admin) — a citizen sent a swarm report.
	new_report: {
		icon: "pinhead:bee",
		color: "#ff9a00",
	},
	// NEW (admin) — a beekeeper's pesticide alert is waiting for approval.
	alert_review: {
		icon: "mdi:clock-alert-outline",
		color: "#ff0000",
	},
	// NEW (admin) — a beekeeper uploaded a verification document.
	verify_request: {
		icon: "mdi:shield-account",
		color: "#38b6ff",
	},
};
const DEFAULT_STYLE = { icon: "mingcute:alert-fill", color: "#ff0000" };

function timeAgo(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diffMs / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	// Minutes first (1m … 59m ago), then whole hours (1h, 2h … ago).
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
	const pathname = usePathname();
	const isCitizen = pathname.startsWith("/citizen");
	const { openModal } = useModal<ModalType, BeeReportPayload>();
	const [notifs, setNotifs] = useState<NotificationRecord[]>([]);
	const [loading, setLoading] = useState(true);
	// Changes every 30 s only so the time labels are worked out again.
	const [, setClockTick] = useState(0);

	useEffect(() => {
		let cancelled = false;
		let first = true;
		const load = async () => {
			// Skeleton only on the first load, not on every refresh.
			if (first) setLoading(true);
			const res = await notificationService.list({ limit: 30 });
			if (cancelled) return;
			if (res.success && res.data) setNotifs(res.data);
			if (first) {
				first = false;
				setLoading(false);
			}
		};
		load();
		const refresh = setInterval(load, LIST_REFRESH_MS);

		// A push arrived while this is open -> show it now.
		const onPush = (e: MessageEvent) => {
			if (e.data?.type === PUSH_MESSAGE_EVENT) load();
		};
		if (pushSupported()) {
			navigator.serviceWorker.addEventListener("message", onPush);
		}
		return () => {
			cancelled = true;
			clearInterval(refresh);
			if (pushSupported()) {
				navigator.serviceWorker.removeEventListener("message", onPush);
			}
		};
	}, []);

	// Keep "just now / 5m ago" up to date.
	useEffect(() => {
		const t = setInterval(() => setClockTick((n) => n + 1), TIME_LABEL_TICK_MS);
		return () => clearInterval(t);
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

		// Admin notifications -> the page where the admin acts on it.
		if (pathname.startsWith("/admin")) {
			if (notif.notification_type === "new_report" && notif.reportID) {
				router.push(
					`/admin/report?report=${encodeURIComponent(notif.reportID)}`,
				);
			} else if (notif.notification_type === "alert_review") {
				router.push("/admin/alert?tab=pending");
			} else if (notif.notification_type === "verify_request") {
				router.push("/admin/profile?tab=verification");
			}
			return;
		}

		if (notif.notification_type === "pesticide_alert" && notif.alert_id) {
			router.push(`/beekeeper/alert/details?id=${notif.alert_id}`);
			return;
		}

		// Verification result -> Profile > Verify Your Account.
		if (notif.notification_type === "verification") {
			router.push("/beekeeper/profile?view=main&detail=verify");
			return;
		}

		if (!notif.reportID) return;

		// Citizen: offers / resolved rescue -> Documents on that report
		// (where they accept offers and rate the beekeeper).
		if (isCitizen) {
			router.push(
				`/citizen/document?report=${encodeURIComponent(notif.reportID)}`,
			);
			return;
		}

		// Beekeeper: report notifications -> Report tab + that report's details.
		if (
			notif.notification_type === "rescue_report" ||
			notif.notification_type === "offer_update" ||
			notif.notification_type === "rescue_resolved"
		) {
			router.push("/beekeeper/report");
			openModal("BeeReport", { reportId: notif.reportID });
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
			<>
				{Array.from({ length: 5 }).map((_, i) => (
					<NotifCardSkeleton key={i} />
				))}
			</>
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