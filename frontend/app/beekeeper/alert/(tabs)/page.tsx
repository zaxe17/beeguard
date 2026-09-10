// app/beekeeper/alert/(tabs)/page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PesticideAlert } from "@/components/ui/Alert";
import { ALERTS_CHANGED_EVENT } from "@/components/modal/AlertModal";
import { pesticideService, AlertRecord } from "@/services/pesticide";
import { useAlertLocations, getAlertLocation } from "@/hooks/useAlertLocation";

function toDisplayDate(a: AlertRecord): string {
	return new Date(a.scheduled_date).toLocaleDateString();
}

function toDisplayTime(a: AlertRecord): string {
	return new Date(a.scheduled_date).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

const Alert = () => {
	const router = useRouter();
	const [alerts, setAlerts] = useState<AlertRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// Exact-location cache for alerts that have no affected_area —
	// see hooks/useAlertLocation.ts.
	const resolvedLocations = useAlertLocations(alerts);

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

	// Refetch immediately whenever a new alert is published anywhere
	// (AddAlert modal dispatches this on success) — no manual reload
	// needed.
	useEffect(() => {
		const handler = () => loadAlerts();
		window.addEventListener(ALERTS_CHANGED_EVENT, handler);
		return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handler);
	}, [loadAlerts]);

	const sorted = [...alerts].sort(
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
			) : sorted.length === 0 ? (
				<p className="text-center text-sm text-[#817b70] p-4">
					No active alerts.
				</p>
			) : (
				sorted.map((a) => (
					<PesticideAlert
						key={a.alert_id}
						location={getAlertLocation(a, resolvedLocations)}
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

export default Alert;