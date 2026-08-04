// app/beekeeper/alert/today/page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PesticideAlert } from "@/components/ui/Alert";
import { ALERTS_CHANGED_EVENT } from "@/components/modal/AlertModal";
import { pesticideService, AlertRecord } from "@/services/pesticide";

function toDisplayLocation(a: AlertRecord): string {
	if (a.affected_area) return a.affected_area;
	const lat = Number(a.latitude);
	const lng = Number(a.longitude);
	if (Number.isNaN(lat) || Number.isNaN(lng)) return "Unknown location";
	return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function toDisplayDate(a: AlertRecord): string {
	return new Date(a.scheduled_date).toLocaleDateString();
}

function toDisplayTime(a: AlertRecord): string {
	return new Date(a.scheduled_date).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function isToday(a: AlertRecord): boolean {
	const alertDate = new Date(a.scheduled_date);
	const today = new Date();
	return (
		alertDate.getDate() === today.getDate() &&
		alertDate.getMonth() === today.getMonth() &&
		alertDate.getFullYear() === today.getFullYear()
	);
}

const TodayAlert = () => {
	const router = useRouter();
	const [alerts, setAlerts] = useState<AlertRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const loadAlerts = useCallback(async () => {
		setLoading(true);
		setErrorMsg(null);
		const res = await pesticideService.listActiveAlerts();
		if (res.success && res.data) {
			setAlerts(res.data);
		} else if (!res.success) {
			setErrorMsg(res.message);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		loadAlerts();
	}, [loadAlerts]);

	// Refetch immediately whenever a new alert is published anywhere.
	useEffect(() => {
		const handler = () => loadAlerts();
		window.addEventListener(ALERTS_CHANGED_EVENT, handler);
		return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handler);
	}, [loadAlerts]);

	const todayOnly = alerts
		.filter(isToday)
		.sort(
			(a, b) =>
				new Date(a.scheduled_date).getTime() -
				new Date(b.scheduled_date).getTime(),
		);

	return (
		<div className="w-full h-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 py-1 px-3">
			{loading ? (
				<p className="text-center text-sm text-[#817b70] p-4">
					Loading alerts...
				</p>
			) : errorMsg ? (
				<p className="text-center text-sm text-red-600 p-4">
					{errorMsg}
				</p>
			) : todayOnly.length === 0 ? (
				<p className="text-center text-sm text-[#817b70] p-4">
					No alerts scheduled for today.
				</p>
			) : (
				todayOnly.map((a) => (
					<PesticideAlert
						key={a.alert_id}
						location={toDisplayLocation(a)}
						date={toDisplayDate(a)}
						time={toDisplayTime(a)}
						status={a.risk_level.toLowerCase() as "high" | "medium" | "low"}
						onClick={() =>
							router.push(`/beekeeper/alert/details?id=${a.alert_id}`)
						}
					/>
				))
			)}
		</div>
	);
};

export default TodayAlert;