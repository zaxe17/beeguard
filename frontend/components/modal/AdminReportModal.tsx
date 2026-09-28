// components/modal/AdminReportModal.tsx
//
// Admin → Reports: tapping a report card opens this popup with the full
// report (photo, bee, place, date, details, danger, status), the map
// pin, who reported it, and every beekeeper offer on it.
// Controlled by the page (reportId / onClose) — not the global
// ModalContext — so it works on any admin page without registering it.

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { ModalContainer } from "./Modal";
import MobileOverlay from "@/components/MobileOverlay";
import ReportDetails from "../ReportDetails";
import { ProfilePhoto } from "../ProfilePhoto";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { speciesLabel } from "@/data/species";
import { adminService, type AdminReportDetail, type AdminReportOffer } from "@/services/admin";
import {
	formatDate,
	formatTime,
	reportImageSrc,
	toAdminUiStatus,
} from "@/services/citizenReport";

const Map = dynamic(() => import("../ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

type Props = {
	reportId: string | null;
	onClose: () => void;
};

const OFFER_BADGE: Record<AdminReportOffer["offer_status"], string> = {
	Pending: "bg-[#ffdb4f]/40 text-[#854F0B]",
	Accepted: "bg-[#ff9a00]/25 text-[#b35f00]",
	Resolved: "bg-[#8ac44f]/25 text-[#1f6f5f]",
	Rejected: "bg-red-600/15 text-red-600",
};

// Admin side shows a declined offer as "Cancelled" (red), not "Rejected".
const OFFER_LABEL: Record<AdminReportOffer["offer_status"], string> = {
	Pending: "Pending",
	Accepted: "Accepted",
	Resolved: "Resolved",
	Rejected: "Cancelled",
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<h3 className="Poppins-SemiBold text-[#817b70]">{children}</h3>
);

const Stars = ({ value }: { value: number }) => (
	<span className="flex items-center">
		{[1, 2, 3, 4, 5].map((n) => (
			<Icon
				key={n}
				icon={n <= value ? "mdi:star" : "mdi:star-outline"}
				className="w-4 h-4 text-[#ffce1c]"
			/>
		))}
	</span>
);

const Content = ({ reportId }: { reportId: string }) => {
	const [data, setData] = useState<AdminReportDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		adminService.report(reportId).then((res) => {
			if (cancelled) return;
			if (res.success && res.data) {
				setData(res.data);
				setErrorMsg(null);
			} else {
				setErrorMsg(res.message || "Couldn't load this report.");
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [reportId]);

	if (loading) {
		return <p className="text-sm text-[#817b70] text-center py-10">Loading report…</p>;
	}
	if (errorMsg || !data) {
		return (
			<p className="text-sm text-red-600 text-center py-10">
				{errorMsg || "Report not found."}
			</p>
		);
	}

	const { report, offers } = data;
	const when = report.sighted_at ?? report.reported_at;
	const lat = Number(report.latitude);
	const lng = Number(report.longitude);

	return (
		<div className="flex flex-col gap-6 w-full">
			<ReportDetails
				status={toAdminUiStatus(report.status)}
				reportId={report.reportID}
				specification={speciesLabel(report.ai_species_identified)}
				latitude={lat}
				longitude={lng}
				imageUrl={reportImageSrc(report.image_url)}
				date={formatDate(when)}
				time={formatTime(when)}
				details={report.description || "No details provided."}
				activity="—"
				danger={report.bee_danger}
			/>

			{/* TIMELINE */}
			<div className="flex flex-col gap-1 text-sm">
				<SectionTitle>Timeline</SectionTitle>
				<p className="text-[#4A2F00]">
					<span className="Poppins-SemiBold">Sent:</span>{" "}
					{formatDate(report.reported_at)} • {formatTime(report.reported_at)}
				</p>
				{report.resolved_at && (
					<p className="text-[#4A2F00]">
						<span className="Poppins-SemiBold">Resolved:</span>{" "}
						{formatDate(report.resolved_at)} • {formatTime(report.resolved_at)}
					</p>
				)}
				{report.cancelled_at && (
					<p className="text-[#4A2F00]">
						<span className="Poppins-SemiBold">Cancelled by citizen:</span>{" "}
						{formatDate(report.cancelled_at)} • {formatTime(report.cancelled_at)}
					</p>
				)}
			</div>

			{/* MAP */}
			{!Number.isNaN(lat) && !Number.isNaN(lng) && (
				<div className="flex flex-col gap-2">
					<SectionTitle>Location</SectionTitle>
					<div className="w-full h-60 rounded-xl relative overflow-hidden">
						<Map markerPosition={{ lat, lng }} readOnly />
					</div>
				</div>
			)}

			{/* REPORTED BY */}
			<div className="flex flex-col gap-2">
				<SectionTitle>Reported By</SectionTitle>
				<div className="flex items-center gap-3 p-2 rounded-xl border border-[#e2e2e6]">
					<div className="w-12 h-12 shrink-0">
						<ProfilePhoto />
					</div>
					<div className="min-w-0">
						<p className="Poppins-SemiBold text-[#4A2F00]">{report.citizen_name ?? "Citizen"}</p>
						<p className="text-xs text-[#a6a3a3] break-all">
							{[report.citizen_email, report.citizen_contact].filter(Boolean).join(" • ") ||
								"Citizen"}
						</p>
					</div>
				</div>
			</div>

			{/* BEEKEEPER OFFERS */}
			<div className="flex flex-col gap-2">
				<SectionTitle>Beekeeper Offers ({offers.length})</SectionTitle>
				{offers.length === 0 ? (
					<p className="text-sm text-[#a6a3a3]">No beekeeper has offered to rescue yet.</p>
				) : (
					offers.map((o) => (
						<div
							key={o.offer_id}
							className="flex flex-col gap-1 p-2 rounded-xl border border-[#e2e2e6]">
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<p className="Poppins-SemiBold text-[#4A2F00] line-clamp-1">
										{o.beekeeper_name}
										{o.farm_name ? ` • ${o.farm_name}` : ""}
									</p>
									<p className="text-xs text-[#a6a3a3]">
										{o.beekeeper_contact ?? "—"} • offered {formatDate(o.created_at)}
									</p>
								</div>
								<span
									className={`Poppins-SemiBold text-[10px] py-1 px-2 rounded-full shrink-0 ${OFFER_BADGE[o.offer_status]}`}>
									{OFFER_LABEL[o.offer_status]}
								</span>
							</div>
							<div className="flex items-center justify-between gap-2 text-sm">
								<span className="text-[#817b70]">
									Offer:{" "}
									<span className="Poppins-SemiBold text-[#ff9a00]">
										{Number(o.offered_fee) > 0
											? `PHP ${Number(o.offered_fee).toLocaleString()}`
											: "Free rescue"}
									</span>
								</span>
								{o.rating_value != null && (
									<span className="flex items-center gap-1 text-xs text-[#817b70]">
										Rated <Stars value={o.rating_value} />
									</span>
								)}
							</div>
							{o.rating_comment && (
								<p className="text-xs text-[#817b70] italic">&ldquo;{o.rating_comment}&rdquo;</p>
							)}
						</div>
					))
				)}
			</div>
		</div>
	);
};

export const AdminReportModal = ({ reportId, onClose }: Props) => {
	const isDesktop = useIsDesktop();
	if (!reportId) return null;

	// key: fresh state when a different report is opened
	const content = <Content key={reportId} reportId={reportId} />;

	if (isDesktop) {
		return (
			<ModalContainer
				open
				width="lg:w-1/2 w-full"
				height="lg:h-5/6 h-full"
				header="Report Details"
				onClose={onClose}>
				{content}
			</ModalContainer>
		);
	}

	return (
		<MobileOverlay>
			<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6]">
				<button onClick={onClose} className="absolute flex items-center shrink-0">
					<Icon icon="bx:arrow-back" className="text-2xl text-[#ffa004]" />
				</button>
				<span className="w-full Poppins-SemiBold text-sm text-[#4a2f00] text-center">
					Report Details
				</span>
			</div>
			<div className="flex flex-col gap-6 py-6 px-4 w-full max-w-full overflow-x-hidden">
				{content}
			</div>
		</MobileOverlay>
	);
};

export default AdminReportModal;