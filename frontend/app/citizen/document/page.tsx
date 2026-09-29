"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReportDetails from "@/components/ReportDetails";
import { Container } from "@/components/ui/Container";
import { CancelButton } from "@/components/ui/Button";
import { Beekeeper, type RescueOffer } from "@/components/Beekeeper";
import { api } from "@/services/api";
import {
	type ApiReport,
	REPORTS_CHANGED_EVENT,
	formatDate,
	formatTime,
	reportImageSrc,
	reportWhen,
	toUiStatus,
} from "@/services/citizenReport";
import { speciesLabel } from "@/data/species";
import { OfferSkeleton, ReportDetailsSkeleton } from "@/components/loading/SkeletonLoading";

// New offers from beekeepers show up without a page refresh.
const OFFER_POLL_MS = 10000;
// Two-tap confirm window for Cancel Report.
const CONFIRM_MS = 4000;

// Cancel button shown while the report is still waiting for offers.
// (Once a beekeeper is assigned, Cancel Report lives on their card.)
const CancelPendingReport = ({
	onCancelReport,
}: {
	onCancelReport: () => Promise<string | null>;
}) => {
	const [armed, setArmed] = useState(false);
	const [busy, setBusy] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (!armed) return;
		const t = setTimeout(() => setArmed(false), CONFIRM_MS);
		return () => clearTimeout(t);
	}, [armed]);

	const handleClick = async () => {
		if (busy) return;
		if (!armed) {
			setArmed(true);
			return;
		}
		setArmed(false);
		setBusy(true);
		setErrorMsg(null);
		const err = await onCancelReport();
		setBusy(false);
		if (err) setErrorMsg(err);
	};

	return (
		<div className="flex flex-col items-end gap-1 mt-3">
			<CancelButton
				BGcolor={armed ? "bg-red-600" : "bg-[#e2e2e6]"}
				textColor={armed ? "white" : "#ff3131"}
				width="150px"
				label={
					busy
						? "Cancelling…"
						: armed
							? "Tap to confirm"
							: "Cancel Report"
				}
				onClick={handleClick}
			/>
			{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
		</div>
	);
};

// PENDING — citizen picks one of the beekeepers' offers.
const Offer = ({
	offers,
	onUpdated,
	onCancelReport,
}: {
	offers: RescueOffer[];
	onUpdated: () => void;
	onCancelReport: () => Promise<string | null>;
}) => {
	return (
		<Container width="100%" className="shrink-0 max-w-2xl">
			<span className="Poppins-SemiBold text-[#a6a3a3] text-base">
				Choose Offer
			</span>
			<div className="w-full max-h-70 overflow-y-scroll flex flex-col pr-1">
				{offers.length === 0 ? (
					<p className="text-sm text-[#a6a3a3] py-4 text-center">
						No offers yet. Nearby beekeepers have been notified.
						Offers will appear here automatically.
					</p>
				) : (
					offers.map((offer) => (
						<Beekeeper
							key={offer.offer_id}
							offer={offer}
							onUpdated={onUpdated}
						/>
					))
				)}
			</div>
			<CancelPendingReport onCancelReport={onCancelReport} />
		</Container>
	);
};

// IN PROGRESS / RESOLVED — the accepted beekeeper (message, then rate).
const Assigned = ({
	offer,
	onUpdated,
	onCancelReport,
}: {
	offer: RescueOffer;
	onUpdated: () => void;
	onCancelReport: () => Promise<string | null>;
}) => {
	return (
		<div className="w-full">
			<p className="Poppins-SemiBold text-[#a6a3a3] text-base mb-2">
				Beekeeper Assigned
			</p>
			{/* key: fresh rating state when switching between reports */}
			<Beekeeper
				key={offer.offer_id}
				offer={offer}
				onUpdated={onUpdated}
				onCancelReport={onCancelReport}
			/>
		</div>
	);
};

const DocumentContent = () => {
	const searchParams = useSearchParams();
	const reportParam = searchParams.get("report");

	const [reportId, setReportId] = useState<string | null>(reportParam);
	const [report, setReport] = useState<ApiReport | null>(null);
	const [offers, setOffers] = useState<RescueOffer[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// ── Which report to show ────────────────────────
	// ?report=<id> if given, otherwise the citizen's newest report.
	useEffect(() => {
		if (reportParam) {
			setReportId(reportParam);
			return;
		}
		let cancelled = false;
		api.get<ApiReport[]>("/reports").then((res) => {
			if (cancelled) return;
			if (res.success && res.data && res.data.length > 0) {
				setReportId(res.data[0].reportID);
			} else {
				setReportId(null);
				setReport(null);
				setLoading(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [reportParam]);

	const loadReport = useCallback(async () => {
		if (!reportId) return;
		const res = await api.get<ApiReport>(`/reports/${reportId}`);
		if (res.success && res.data) {
			setReport(res.data);
			setErrorMsg(null);
		} else {
			setReport(null);
			setErrorMsg(res.message || "Report not found.");
		}
	}, [reportId]);

	const loadOffers = useCallback(async () => {
		if (!reportId) return;
		const res = await api.get<RescueOffer[]>(
			`/rescue-offers/report/${reportId}`,
		);
		if (res.success && res.data) setOffers(res.data);
	}, [reportId]);

	// ── Load report + offers, then keep offers fresh ─
	useEffect(() => {
		if (!reportId) return;
		let cancelled = false;
		setLoading(true);
		setOffers([]);

		Promise.all([loadReport(), loadOffers()]).then(() => {
			if (!cancelled) setLoading(false);
		});

		const interval = setInterval(loadOffers, OFFER_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [reportId, loadReport, loadOffers]);

	// After accept / reject / resolve / rating / cancel — the report's
	// status may have changed too, so refresh both sides of the page.
	const handleUpdated = () => {
		loadReport();
		loadOffers();
		window.dispatchEvent(new Event(REPORTS_CHANGED_EVENT));
	};

	// Returns an error message, or null on success.
	const cancelReport = async (): Promise<string | null> => {
		if (!reportId) return "No report selected.";
		const res = await api.post<ApiReport>(
			`/reports/${reportId}/cancel`,
			{},
		);
		if (res.success) {
			handleUpdated();
			return null;
		}
		return res.message || "Couldn't cancel this report.";
	};

	if (loading) {
		return (
			<div className="w-full flex flex-col gap-4">
				<ReportDetailsSkeleton />
				<OfferSkeleton />
			</div>
		);
	}

	if (!report) {
		return (
			<div className="w-full py-10 text-center text-sm text-[#a6a3a3]">
				{errorMsg ?? "You haven't submitted any reports yet."}
			</div>
		);
	}

	// Accepting one offer rejects the rest, so at most one of these.
	const assignedOffer =
		offers.find(
			(o) =>
				o.offer_status === "Accepted" || o.offer_status === "Resolved",
		) ?? null;
	const pendingOffers = offers.filter((o) => o.offer_status === "Pending");
	const isClosed =
		report.status === "Resolved" ||
		report.status === "False Alarm" ||
		report.status === "Cancelled";
	const when = reportWhen(report);

	return (
		<>
			<h1 className="Poppins-SemiBold text-xl pb-5 lg:block hidden">
				Report Details
			</h1>

			<ReportDetails
				status={toUiStatus(report.status)}
				reportId={report.reportID}
				specification={speciesLabel(report.ai_species_identified)}
				latitude={report.latitude}
				longitude={report.longitude}
				imageUrl={reportImageSrc(report.image_url)}
				date={formatDate(when)}
				time={formatTime(when)}
				details={report.description || "No details provided."}
				activity="—"
				danger={report.bee_danger}
			/>

			{report.status === "Cancelled" ? (
				<p className="text-sm text-[#817b70] text-center py-2">
					You cancelled this report.
				</p>
			) : assignedOffer ? (
				<Assigned
					offer={assignedOffer}
					onUpdated={handleUpdated}
					onCancelReport={cancelReport}
				/>
			) : (
				!isClosed && (
					<Offer
						offers={pendingOffers}
						onUpdated={handleUpdated}
						onCancelReport={cancelReport}
					/>
				)
			)}
		</>
	);
};

const Document = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DocumentContent />
		</Suspense>
	);
};

export default Document;
