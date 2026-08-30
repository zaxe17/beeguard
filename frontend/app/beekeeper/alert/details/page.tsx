// app/beekeeper/alert/details/page.tsx

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import { AlertContainer } from "@/components/ui/Alert";
import { pesticideService, AlertDetail } from "@/services/pesticide";

// Leaflet touches `window` at module-evaluation time, so it can't be
// server-rendered — same fix already applied in AlertModal.tsx. This
// page previously did a static `import Map from "..."`, which forced
// Next to SSR it and crashed with "window is not defined".
const Map = dynamic(() => import("@/components/ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

type DetailsProps = {
	location?: string;
	date?: string;
	time?: string;
	desc?: string;
	status: "high" | "medium" | "low";
};

type InformationProps = {
	pesTyp?: string;
	method?: string;
	date?: string;
	time?: string;
	radius?: string;
	issued?: string;
	contact?: string;
};

const alertLevels = {
	high: {
		text: "#e63946",
		bg: "#ff0000",
	},
	medium: {
		text: "#f77f00",
		bg: "#ff9a00",
	},
	low: {
		text: "#2d9d5f",
		bg: "#00cc00",
	},
};

// ALERT DETAILS
const Details = ({ location, date, time, desc, status }: DetailsProps) => {
	return (
		<AlertContainer title="Alert Details">
			<div className="w-full h-full flex items-center gap-4">
				<div className="w-15 h-15">
					<Icon
						icon="line-md:alert-twotone"
						className="w-full h-full block"
						style={{
							color: alertLevels[status].text,
						}}
					/>
				</div>

				{/* ALERT DETAILS */}
				<div className="w-full flex flex-col text-[#817b70] text-xs capitalize">
					<div className="flex justify-between items-center text-base">
						<h3
							className="Poppins-SemiBold text-sm text-black"
							style={{}}>
							Pestiside Spraying Alert
						</h3>

						{/* ALERT STATUS */}
						<span
							className="Poppins-SemiBold w-18 text-[10px] text-center py-1 px-3 rounded-md"
							style={{
								color: alertLevels[status].text,
								backgroundColor: `${alertLevels[status].text}4D`,
							}}>
							{status}
						</span>
					</div>

					{/* LOCATION */}
					<span className="Poppins-SemiBold">{location}</span>
					{/* DATE & TIME */}
					<span className="Poppins-SemiBold mb-7">
						{date} • {time}
					</span>
					{/*  */}
					<p className="w-1/2">{desc}</p>
				</div>
			</div>
		</AlertContainer>
	);
};

// ALERT INFORMATION
const Information = ({
	pesTyp,
	method,
	date,
	time,
	radius,
	issued,
	contact,
}: InformationProps) => {
	return (
		<AlertContainer title="Alert Information">
			<div className="w-full flex flex-col gap-3 text-sm">
				<div className="flex justify-between items-center">
					<span className="">Pesticide Type</span>
					<span className="Poppins-SemiBold">{pesTyp}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Application Method</span>
					<span className="Poppins-SemiBold">{method}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Scheduled Date</span>
					<span className="Poppins-SemiBold">
						{date} • {time}
					</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Danger Radius</span>
					<span className="Poppins-SemiBold">{radius}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Issued By</span>
					<span className="Poppins-SemiBold">{issued}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="">Contact</span>
					<span className="Poppins-SemiBold">{contact}</span>
				</div>
			</div>
		</AlertContainer>
	);
};

const Recommendation = () => {
	return (
		<div className="bg-[#ff0000]/10 rounded-lg p-5 text-xs">
			<h3 className="Poppins-SemiBold text-[#ff0000] mb-3">
				Recommendation for Beekeepers
			</h3>

			<div className="flex items-center gap-1 mb-1">
				<div className="w-4 h-4">
					<Icon icon="uil:shield-check" className="w-full h-full" />
				</div>
				<span>Keep your hives covered or sheltered.</span>
			</div>

			<div className="flex items-center gap-1 mb-1">
				<div className="w-4 h-4">
					<Icon
						icon="heroicons:no-symbol-20-solid"
						className="w-full h-full"
					/>
				</div>
				<span>Do not open hives during the spraying period.</span>
			</div>

			<div className="flex items-center gap-1 mb-1">
				<div className="w-4 h-4">
					<Icon
						icon="solar:wind-line-duotone"
						className="w-full h-full"
					/>
				</div>
				<span>Ensure good ventilation after the spraying.</span>
			</div>

			<div className="flex items-center gap-1 mb-1">
				<div className="w-4 h-4">
					<Icon icon="ic:baseline-hive" className="w-full h-full" />
				</div>
				<span>Move hives out of the area if possible.</span>
			</div>
		</div>
	);
};

type TimelineStatus = "active" | "pending" | "upcoming";

type TimelineItem = {
	title: string;
	date: string;
	time: string;
	status: TimelineStatus;
};

const statusColors: Record<TimelineStatus, string> = {
	active: "bg-[#ef4444]",
	pending: "bg-[#f97316]",
	upcoming: "bg-[#d1d5db]",
};

type AlertTimelineProps = {
	title?: string;
	items: TimelineItem[];
};

const AlertTimeline = ({
	title = "Alert Timeline",
	items,
}: AlertTimelineProps) => {
	return (
		<div className="w-full flex flex-col gap-2">
			<h1 className="Poppins-SemiBold text-xl">{title}</h1>

			<div className="flex flex-col">
				{items.map((item, index) => (
					<div key={index} className="flex gap-3">
						<div className="flex flex-col items-center">
							<span
								className={`w-3 h-3 rounded-full shrink-0 ${statusColors[item.status]}`}
							/>
							{index < items.length - 1 && (
								<span className="w-px flex-1 bg-[#e5e7eb] my-1" />
							)}
						</div>

						<div className={index < items.length - 1 ? "pb-6" : ""}>
							<p className="Poppins-SemiBold text-sm text-[#111827]">
								{item.title}
							</p>
							<p className="text-xs text-[#9ca3af] mt-0.5">
								{item.date} <span className="mx-1">•</span>{" "}
								{item.time}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

function splitDateTime(iso: string | null | undefined) {
	if (!iso) return { date: "—", time: "—" };
	const d = new Date(iso);
	return {
		date: d.toLocaleDateString(undefined, {
			month: "long",
			day: "numeric",
			year: "numeric",
		}),
		time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
	};
}

function stageStatus(
	iso: string | null | undefined,
	fallback: TimelineStatus,
): TimelineStatus {
	if (!iso) return fallback;
	return new Date(iso).getTime() <= Date.now() ? "active" : fallback;
}

// Renamed from AlertDetails — this now holds all the original logic.
// useSearchParams() requires a Suspense boundary around it (see the
// wrapper component below), so this can no longer be the default export.
const AlertDetailsInner = () => {
	const searchParams = useSearchParams();
	const alertId = searchParams.get("id");

	const [alert, setAlert] = useState<AlertDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (!alertId) {
			setLoading(false);
			setErrorMsg("No alert selected.");
			return;
		}

		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setErrorMsg(null);
			const res = await pesticideService.getAlertDetail(alertId);
			if (cancelled) return;

			if (res.success && res.data) {
				setAlert(res.data);
			} else {
				setErrorMsg(res.message || "Failed to load alert.");
			}
			setLoading(false);
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [alertId]);

	if (loading) {
		return (
			<div className="h-screen w-full flex items-center justify-center text-[#817b70]">
				Loading alert…
			</div>
		);
	}

	if (errorMsg || !alert) {
		return (
			<div className="h-screen w-full flex flex-col items-center justify-center gap-2 text-[#817b70]">
				<Icon
					icon="famicons:notifications-off"
					className="w-16 h-16 text-[#a6a3a3]"
				/>
				<p>{errorMsg || "Alert not found."}</p>
			</div>
		);
	}

	const scheduled = splitDateTime(alert.scheduled_date);
	const issued = splitDateTime(alert.created_at);
	const completion = splitDateTime(alert.expiration_date);

	const timelineItems: TimelineItem[] = [
		{
			title: "Alert Issued",
			date: issued.date,
			time: issued.time,
			status: "active",
		},
		{
			title: "Scheduled Spraying",
			date: scheduled.date,
			time: scheduled.time,
			status: stageStatus(alert.scheduled_date, "pending"),
		},
	];

	if (alert.expiration_date) {
		timelineItems.push({
			title: "Expected Completion",
			date: completion.date,
			time: completion.time,
			status: stageStatus(alert.expiration_date, "upcoming"),
		});
	}

	return (
		<div className="h-screen w-full flex gap-15 py-15 px-20">
			{/* LEFT */}
			<div className="w-1/2 capitalize flex flex-col gap-8">
				<Details
					location={alert.location}
					date={scheduled.date}
					time={scheduled.time}
					desc={alert.description ?? undefined}
					status={alert.status}
				/>

				<Information
					pesTyp={alert.pesticide_type ?? "—"}
					method={alert.application_method ?? "—"}
					date={scheduled.date}
					time={scheduled.time}
					radius={`${alert.danger_radius_km} km`}
					issued={alert.issued_by ?? "—"}
					contact={alert.contact ?? "—"}
				/>

				<Recommendation />
			</div>

			{/* RIGHT */}
			<div className="w-1/2">
				{/* MAPS */}
				<h1 className="Poppins-SemiBold text-xl mb-2">Maps</h1>
				<div className="w-full h-80 rounded-xl relative overflow-hidden mb-8">
					<Map
						initialCenter={{
							lat: alert.latitude,
							lng: alert.longitude,
						}}
						initialMarker={{
							lat: alert.latitude,
							lng: alert.longitude,
						}}
						radiusKm={alert.danger_radius_km}
					/>
				</div>

				{/* TIMELINE */}
				<AlertTimeline items={timelineItems} />
			</div>
		</div>
	);
};

// New default export — wraps the page in Suspense so useSearchParams()
// inside AlertDetailsInner no longer breaks static/prerendered builds.
const AlertDetails = () => {
	return (
		<Suspense
			fallback={
				<div className="h-screen w-full flex items-center justify-center text-[#817b70]">
					Loading alert…
				</div>
			}>
			<AlertDetailsInner />
		</Suspense>
	);
};

export default AlertDetails;
