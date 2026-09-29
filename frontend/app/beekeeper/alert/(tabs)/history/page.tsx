// app/beekeeper/alert/history/page.tsx
//
// NEW — Alert HISTORY (beekeeper). Pesticide alerts stay in "All" for
// 14 days after the scheduled spraying (BeeGuard's precautionary validity
// period, see server/services/pesticide_service.py ALERT_VALIDITY_DAYS).
// After that they show up here. The search bar and filter in
// app/beekeeper/alert/layout.tsx work here too. Tapping an alert opens its
// details page (its validity bar shows "Alert period ended").

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PesticideAlert } from "@/components/ui/Alert";
import { ALERTS_CHANGED_EVENT } from "@/components/modal/AlertModal";
import { pesticideService, AlertRecord } from "@/services/pesticide";
import { useAlertLocations, getAlertLocation } from "@/hooks/useAlertLocation";
import { useAuth } from "@/context/AuthContext";
import {
	emptyMessage,
	filterAlerts,
	useAlertFilter,
} from "@/context/AlertFilterContext";

const toDisplayDate = (iso: string) => new Date(iso).toLocaleDateString();

const toDisplayTime = (iso: string) =>
	new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const AlertHistory = () => {
	const router = useRouter();
	const { user } = useAuth();
	const { filter, search } = useAlertFilter();
	const [alerts, setAlerts] = useState<AlertRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const resolvedLocations = useAlertLocations(alerts);

	const loadAlerts = useCallback(async () => {
		setLoading(true);
		setErrorMsg(null);
		const res = await pesticideService.listExpiredAlerts();
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

	useEffect(() => {
		const handler = () => loadAlerts();
		window.addEventListener(ALERTS_CHANGED_EVENT, handler);
		return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handler);
	}, [loadAlerts]);

	// Newest first — same order as the All tab.
	const shown = filterAlerts(
		alerts,
		filter,
		search,
		(a) => getAlertLocation(a, resolvedLocations),
		user?.id,
	).sort(
		(a, b) =>
			new Date(b.scheduled_date).getTime() -
			new Date(a.scheduled_date).getTime(),
	);

	return (
		<div className="w-full h-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 py-1 px-3 lg:scrollbar-auto scrollbar-none">
			{loading ? (
				<p className="text-center text-sm text-[#817b70] p-4">
					Loading alert history...
				</p>
			) : errorMsg ? (
				<p className="text-center text-sm text-red-600 p-4">{errorMsg}</p>
			) : shown.length === 0 ? (
				<p className="text-center text-sm text-[#817b70] p-4">
					{emptyMessage(filter, search, "No ended alerts yet.")}
				</p>
			) : (
				// Same cards as the All tab.
				shown.map((a) => (
					<PesticideAlert
						key={a.alert_id}
						location={getAlertLocation(a, resolvedLocations)}
						date={toDisplayDate(a.scheduled_date)}
						time={toDisplayTime(a.scheduled_date)}
						status={a.risk_level.toLowerCase() as "high" | "medium" | "low"}
						onClick={() =>
							router.push(`/beekeeper/alert/details?id=${a.alert_id}`)
						}
						approvalStatus={a.approval_status}
					/>
				))
			)}
		</div>
	);
};

export default AlertHistory;