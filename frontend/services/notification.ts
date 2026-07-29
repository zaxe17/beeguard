import { api } from "./api";

export interface NotificationRecord {
	notification_id: string;
	beekeeperID: string;
	alert_id: string | null;
	reportID: string | null;
	title: string;
	message: string;
	notification_type: string;
	is_read: boolean;
	created_at: string;
}

export const notificationService = {
	list: (opts?: { unreadOnly?: boolean; limit?: number }) => {
		const qs = new URLSearchParams();
		if (opts?.unreadOnly) qs.set("unread_only", "true");
		if (opts?.limit) qs.set("limit", String(opts.limit));
		const query = qs.toString();
		return api.get<NotificationRecord[]>(
			`/notifications${query ? `?${query}` : ""}`,
		);
	},

	unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),

	markRead: (notificationId: string) =>
		api.post<Record<string, never>>(`/notifications/${notificationId}/read`, {}),

	markAllRead: () =>
		api.post<Record<string, never>>("/notifications/read-all", {}),
};