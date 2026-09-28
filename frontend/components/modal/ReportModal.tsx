"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalContainer } from "./Modal";
import { Button, CancelButton } from "../ui/Button";
import { reportService } from "@/services/report";
import { Icon } from "@iconify/react";
import ReportDetails from "../ReportDetails";
import { ProfilePhoto } from "../ProfilePhoto";
import MobileOverlay from "@/components/MobileOverlay";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useModal } from "@/context/ModalContext";
import { StarRating } from "../ui/StarRating";
import { Input } from "../ui/Input";
import { api } from "@/services/api";
import {
	BEEKEEPER_REPORTS_CHANGED_EVENT,
	beekeeperReportService,
	type BeekeeperReport,
} from "@/services/beekeeperReport";
import {
	formatDate,
	formatTime,
	reportImageSrc,
} from "@/services/citizenReport";
import { speciesLabel } from "@/data/species";

type ReportModalProps = {
	isOpen: boolean;
	onClose: () => void;
};

type ReportOfferModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (amount: number) => void;
	// NEW — while POST /api/rescue-offers is running / if it failed.
	submitting?: boolean;
	errorMsg?: string | null;
};

// "ReportOffer" is no longer a global modal type — it's nested
// locally inside BeeReportContent instead.
type ModalType = "BeeReport";
// Set by app/beekeeper/report/page.tsx when a report card is clicked.
type BeeReportPayload = { reportId: string };

// Matches the "beeIdentify" modal type opened from
// app/citizen/report/layout.tsx's Next button, with the real scan
// result as payload (services/cvscan.ts's CVScanResult fields).
type BeeIdentifyModalType = "beeIdentify";
type BeeIdentifyPayload = {
	species: string | null;
	confidencePercent: number | null;
};

// Two-tap confirm window for "Mark as Resolved".
const CONFIRM_MS = 4000;

// ===== BEEKEEPER SIDE =====
export const GenerateReportModal = ({ isOpen, onClose }: ReportModalProps) => {
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [blob, setBlob] = useState<Blob | null>(null);

	useEffect(() => {
		if (!isOpen) {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			setPreviewUrl(null);
			setBlob(null);
			setErrorMsg(null);
			return;
		}

		let cancelled = false;
		const load = async () => {
			setLoading(true);
			setErrorMsg(null);
			try {
				const fetchedBlob = await reportService.fetchYieldReportBlob();
				if (cancelled) return;
				const url = URL.createObjectURL(fetchedBlob);
				setBlob(fetchedBlob);
				setPreviewUrl(url);
			} catch (err) {
				if (!cancelled) {
					setErrorMsg(
						err instanceof Error
							? err.message
							: "Failed to generate report.",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const handleDownload = () => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "beeguard-yield-report.pdf";
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-2/3 w-full"
			height="h-5/6"
			header="Yield History Report"
			onClose={onClose}>
			<div className="w-full h-full flex-1 flex flex-col gap-3 min-h-0">
				{loading ? (
					<div className="flex-1 flex items-center justify-center">
						<p className="text-sm text-[#817b70]">
							Preparing your report preview...
						</p>
					</div>
				) : errorMsg ? (
					<div className="flex-1 flex items-center justify-center">
						<p className="text-sm text-red-600">{errorMsg}</p>
					</div>
				) : previewUrl ? (
					<iframe
						src={`${previewUrl}#toolbar=1&navpanes=0`}
						title="Yield report preview"
						className="w-full flex-1 rounded-xl border border-[#e2e2e6]"
					/>
				) : null}

				<div className="flex items-center gap-3 w-full shrink-0">
					<CancelButton onClick={onClose} />
					<Button
						buttonType="button"
						label="Download"
						onClick={handleDownload}
						disabled={loading || !blob}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};

// Real report for the beekeeper: details, who reported it, and the
// actions this beekeeper can take right now (offer / message / resolve).
const BeeReportContent = ({ reportId }: { reportId: string }) => {
	const router = useRouter();

	const [report, setReport] = useState<BeekeeperReport | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
	const [offerSubmitting, setOfferSubmitting] = useState(false);
	const [offerError, setOfferError] = useState<string | null>(null);
	const [resolveArmed, setResolveArmed] = useState(false);

	const load = useCallback(async () => {
		const res = await beekeeperReportService.getOne(reportId);
		if (res.success && res.data) {
			setReport(res.data);
			setErrorMsg(null);
		} else {
			setReport(null);
			setErrorMsg(res.message || "Couldn't load this report.");
		}
		setLoading(false);
	}, [reportId]);

	useEffect(() => {
		setLoading(true);
		setActionError(null);
		load();
	}, [load]);

	// Disarm "Tap to confirm" if the second tap never comes.
	useEffect(() => {
		if (!resolveArmed) return;
		const t = setTimeout(() => setResolveArmed(false), CONFIRM_MS);
		return () => clearTimeout(t);
	}, [resolveArmed]);

	const afterChange = async () => {
		await load();
		window.dispatchEvent(new Event(BEEKEEPER_REPORTS_CHANGED_EVENT));
	};

	const handleOfferSubmit = async (amount: number) => {
		setOfferSubmitting(true);
		setOfferError(null);
		const res = await beekeeperReportService.makeOffer(reportId, amount);
		setOfferSubmitting(false);
		if (res.success) {
			setIsOfferModalOpen(false);
			await afterChange();
		} else {
			setOfferError(res.message || "Couldn't send your offer.");
		}
	};

	const handleMessage = async () => {
		if (!report || busy) return;
		setBusy(true);
		setActionError(null);
		const res = await api.post<{ chat_id: number }>("/chats/start", {
			other_id: report.citizenID,
		});
		setBusy(false);
		if (res.success && res.data) {
			router.push(`/beekeeper/messages?chat=${res.data.chat_id}`);
		} else {
			setActionError(res.message || "Couldn't open a conversation.");
		}
	};

	const handleResolve = async () => {
		if (!report?.my_offer_id || busy) return;
		if (!resolveArmed) {
			setResolveArmed(true);
			return;
		}
		setResolveArmed(false);
		setBusy(true);
		setActionError(null);
		const res = await beekeeperReportService.resolve(report.my_offer_id);
		setBusy(false);
		if (res.success) {
			await afterChange();
		} else {
			setActionError(res.message || "Couldn't mark this rescue as resolved.");
		}
	};

	if (loading) {
		return <p className="text-sm text-[#817b70] text-center py-10">Loading report…</p>;
	}
	if (!report) {
		return (
			<p className="text-sm text-red-600 text-center py-10">
				{errorMsg ?? "Report not found."}
			</p>
		);
	}

	const status = report.beekeeper_status;
	const hasOffered = report.my_offer_status === "Pending";
	// The citizen declined my last offer, but the report is still open.
	const wasDeclined = status === "pending" && report.my_offer_status === "Rejected";
	const offerLabel = hasOffered
		? "Offered"
		: wasDeclined
			? report.can_offer
				? "New Offer"
				: "No offers left"
			: "Offer";
	const when = report.sighted_at ?? report.reported_at;

	const actions = (() => {
		switch (status) {
			case "pending":
				return (
					<>
						<Button
							label={offerLabel}
							width="w-40"
							onClick={
								report.can_offer
									? () => {
											setOfferError(null);
											setIsOfferModalOpen(true);
										}
									: undefined
							}
							disabled={!report.can_offer || busy}
							bgNone={!report.can_offer}
						/>
						<Button
							label={busy ? "…" : "Message"}
							width="w-40"
							onClick={handleMessage}
							disabled={busy}
						/>
					</>
				);
			case "in-progress":
				return (
					<>
						<Button
							label={busy ? "…" : "Message"}
							width="w-40"
							onClick={handleMessage}
							disabled={busy}
						/>
						<Button
							label={resolveArmed ? "Tap to confirm" : "Mark as Resolved"}
							width="w-45"
							onClick={handleResolve}
							disabled={busy}
						/>
					</>
				);
			case "resolved":
				return (
					<Button
						label={busy ? "…" : "Message"}
						width="lg:w-40 w-full"
						onClick={handleMessage}
						disabled={busy}
					/>
				);
			default:
				return <Button label="Rejected" width="lg:w-40 w-full" disabled />;
		}
	})();

	return (
		<>
			<ReportDetails
				status={status}
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
			<div className="flex flex-col gap-1">
				<div className="flex flex-row items-center justify-between gap-1">
					<span className="Poppins-SemiBold text-[#817b70]">
						Reported By
					</span>
					{report.my_offered_fee != null && !wasDeclined && (
						<span className="Poppins-SemiBold text-[#817b70]">
							Amount Offer:{" "}
							<span className="text-[#ff9a00]">
								{report.my_offered_fee > 0
									? `PHP ${report.my_offered_fee.toLocaleString()}`
									: "Free rescue"}
							</span>
						</span>
					)}
				</div>

				<div className="w-full flex lg:flex-row flex-col items-center gap-3 p-2 rounded-xl">
					<div className="flex items-center justify-start w-full gap-2">
						<div className="w-15 h-15 shrink-0">
							<ProfilePhoto />
						</div>
						<div>
							<h3 className="Poppins-SemiBold text-base">
								{report.citizen_name ?? "Citizen"}
							</h3>
							<p className="text-sm text-[#a6a3a3]">
								Citizen
								{report.distance_km != null && ` • ${report.distance_km} km away`}
							</p>
							{status === "resolved" &&
								(report.my_rating ? (
									<span className="text-sm text-[#a6a3a3] flex items-center gap-1">
										Rated you
										<StarRating value={report.my_rating} onChange={() => {}} />
									</span>
								) : (
									<span className="text-sm text-[#a6a3a3]">Not rated yet</span>
								))}
						</div>
					</div>

					<div className="lg:ml-auto lg:pr-3 lg:w-auto w-full flex items-center gap-2">
						{actions}
					</div>
				</div>

				{/* Declined, report still open -> can send a new offer */}
				{wasDeclined && (
					<p
						className={`text-xs rounded-md p-2 ${
							report.can_offer
								? "bg-[#FAEEDA] text-[#854F0B]"
								: "bg-[#e2e2e6] text-[#817b70]"
						}`}>
						The citizen declined your{" "}
						{report.my_offered_fee && report.my_offered_fee > 0
							? `PHP ${report.my_offered_fee.toLocaleString()}`
							: "free rescue"}{" "}
						offer.{" "}
						{report.can_offer
							? `You can send a new one (${report.offers_left} offer${report.offers_left === 1 ? "" : "s"} left).`
							: "You've reached the limit of offers for this report."}
					</p>
				)}

				{actionError && (
					<p className="text-xs text-red-600 text-right">{actionError}</p>
				)}
			</div>

			{/* nested modal — hindi galing sa global ModalContext,
			    kaya hindi na siya nagsasara ng BeeReport */}
			<ReportOfferModal
				isOpen={isOfferModalOpen}
				onClose={() => setIsOfferModalOpen(false)}
				onSubmit={handleOfferSubmit}
				submitting={offerSubmitting}
				errorMsg={offerError}
			/>
		</>
	);
};

export const BeeReport = ({ isOpen, onClose }: ReportModalProps) => {
	const isDesktop = useIsDesktop();
	const { payload } = useModal<ModalType, BeeReportPayload>();

	if (!isOpen) return null;

	const reportId = payload?.reportId;
	const content = reportId ? (
		// key: fresh state when a different report is opened
		<BeeReportContent key={reportId} reportId={reportId} />
	) : (
		<p className="text-sm text-[#817b70] text-center py-10">No report selected.</p>
	);

	if (isDesktop) {
		return (
			<ModalContainer
				open={isOpen}
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
				<button
					onClick={onClose}
					className="absolute flex items-center shrink-0">
					<Icon
						icon="bx:arrow-back"
						className="text-2xl text-[#ffa004]"
					/>
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

// standalone component na tumatanggap ng onSubmit prop —
// hindi na umaasa sa global ModalContext
export const ReportOfferModal = ({
	isOpen,
	onClose,
	onSubmit,
	submitting = false,
	errorMsg = null,
}: ReportOfferModalProps) => {
	const [amount, setAmount] = useState("");

	useEffect(() => {
		if (isOpen) setAmount("");
	}, [isOpen]);

	// The amount is OPTIONAL: empty (or 0) = free rescue.
	const trimmed = amount.trim();
	const parsed = trimmed === "" ? 0 : Number(trimmed);
	const isValid = !Number.isNaN(parsed) && parsed >= 0;
	const isFree = isValid && parsed === 0;

	const handleSubmit = () => {
		if (!isValid || submitting) return;
		onSubmit(parsed);
	};

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/4 w-full"
			header="Make an Offer"
			onClose={onClose}>
			<div className="flex flex-col gap-3">
				<Input
					type="number"
					placeholder="Enter amount (PHP) — optional"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
				/>
				<p className={`text-xs ${isValid ? "text-[#817b70]" : "text-red-600"}`}>
					{!isValid
						? "Enter 0 or a positive amount."
						: isFree
							? "No amount = you'll rescue these bees for free."
							: `The citizen will see your offer of PHP ${parsed.toLocaleString()}.`}
				</p>
				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
				<div className="w-full flex gap-3">
					<CancelButton onClick={onClose} />
					<Button
						label={
							submitting
								? "Sending…"
								: isFree
									? "Offer Free Rescue"
									: "Submit Offer"
						}
						onClick={handleSubmit}
						disabled={!isValid || submitting}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};

// ===== CITIZEN SIDE ======

// Species display labels ("Apis cerana / Asian Honey Bee") live in
// data/species.ts — shared with the report flow, Documents and the
// beekeeper's Report tab.

const confidenceLabel = (pct: number | null): string => {
	if (pct === null) return "No Match";
	if (pct >= 85) return "High Confidence";
	if (pct >= 60) return "Medium Confidence";
	return "Low Confidence";
};

type BeeIdentifyProps = ReportModalProps & {
	onSubmit?: () => void;
	submitting?: boolean;
};

export const BeeIdentify = ({
	isOpen,
	onClose,
	onSubmit,
	submitting = false,
}: BeeIdentifyProps) => {
	const { payload } = useModal<BeeIdentifyModalType, BeeIdentifyPayload>();
	const species = payload?.species ?? null;
	const confidencePercent = payload?.confidencePercent ?? null;

	const hasMatch = species !== null && confidencePercent !== null;
	const displaySpecies = species ? speciesLabel(species) : "No bee detected";
	const pctLabel = confidencePercent !== null ? `${Math.round(confidencePercent)}%` : "—";

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/4 w-full"
			header="Bee Species Identified!"
			onClose={onClose}>
			<div className="flex flex-col justify-center items-center">
				<span className="Poppins-SemiBold text-[#817b70] text-sm">
					You are seeing:
				</span>

				<span className="py-1 px-5 flex justify-center items-center border-2 border-[#ffce1c] rounded-lg text-center text-[#4a2f00] text-lg">
					{displaySpecies}
				</span>

				<div
					className={`${hasMatch ? "text-[#00cc00]" : "text-[#a6a3a3]"} flex justify-center items-center gap-1 mt-3`}>
					<span className="Poppins-Bold text-6xl">{pctLabel}</span>
					<div className="flex flex-col">
						<span className="Poppins-SemiBold text-2xl leading-4">
							Match
						</span>
						<span className="text-[#817b70] text-xs">
							{confidenceLabel(confidencePercent)}
						</span>
						{hasMatch && (
							<span className="text-[#817b70] text-xs flex items-center gap-1">
								Identification
								<Icon
									icon="akar-icons:circle-check-fill"
									className="text-[#00cc00]"
								/>
							</span>
						)}
					</div>
				</div>

				<div className="w-full flex gap-3 mt-5">
					<CancelButton onClick={onClose} />
					<Button
						label={submitting ? "Submitting..." : "Submit Photo"}
						onClick={onSubmit}
						disabled={submitting || !hasMatch}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};

// SWARM NOTICE
// Shown right after the citizen confirms the identified species
// ("Submit Photo" on BeeIdentify, end of step 1). Continue -> step 2
// (details); Cancel -> stay on step 1. See app/citizen/layout.tsx.
type SwarmNoticeProps = ReportModalProps & {
	onContinue?: () => void;
};

export const SwarmNotice = ({ isOpen, onClose, onContinue }: SwarmNoticeProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/3 w-full"
			header="Report Swarm Notice"
			onClose={onClose}>
			<div className="flex flex-col justify-center items-center">
				<p className="text-[#817b70] text-center">
					Some beekeepers may charge a fee for bee rescue services to
					cover transportation and relocation costs. However, other
					beekeepers may offer this service free of charge.
				</p>

				<p className="text-[#817b70] text-center text-sm mt-3">
					After you submit, nearby beekeepers will send you their offers
					(some may offer a free rescue). You can compare them and
					choose one in Documents.
				</p>

				<h3 className="Poppins-SemiBold text-xl text-[#4a2f00] mt-5">
					Do you wish to continue?
				</h3>

				<div className="w-full flex gap-3 mt-5">
					<CancelButton onClick={onClose} />
					<Button label="Continue" onClick={onContinue} />
				</div>
			</div>
		</ModalContainer>
	);
};