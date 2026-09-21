"use client";

import { useEffect, useState } from "react";
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

type ReportModalProps = {
	isOpen: boolean;
	onClose: () => void;
};

type ReportOfferModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (amount: number) => void;
};

// "ReportOffer" is no longer a global modal type — it's nested
// locally inside BeeReportContent instead.
type ModalType = "BeeReport";
type ReportStatus = "pending" | "in-progress" | "resolved" | "rejected";

// plain function — cannot call hooks. Takes a ready-made click handler instead.
const renderActions = (
	status: ReportStatus,
	hasOffered: boolean,
	onOfferClick: () => void,
) => {
	switch (status) {
		case "pending":
			return (
				<>
					<Button
						label={hasOffered ? "Offered" : "Offer"}
						width="w-40"
						onClick={hasOffered ? undefined : onOfferClick}
						disabled={hasOffered}
						bgNone={hasOffered}
					/>
					<Button label="Message" width="w-40" />
				</>
			);
		case "in-progress":
			return (
				<>
					<Button label="Message" width="w-40" />
					<Button label="Mark as Resolved" width="w-45" />
				</>
			);
		case "resolved":
			return <Button label="Message" width="lg:w-40 w-full" />;
		case "rejected":
			return <Button label="Rejected" width="lg:w-40 w-full" disabled />;
		default:
			return null;
	}
};

const renderRated = (status: ReportStatus) => {
	const [rating, setRating] = useState(0);

	switch (status) {
		case "resolved":
			return (
				<span className="text-sm text-[#a6a3a3] flex items-center gap-1">
					Rated you
					<StarRating value={rating} onChange={setRating} />
				</span>
			);
		default:
			return null;
	}
};

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

const BeeReportContent = ({ status }: { status: ReportStatus }) => {
	const [hasOffered, setHasOffered] = useState(false);
	const [offerAmount, setOfferAmount] = useState<number | null>(null);
	const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

	const handleOfferSubmit = (amount: number) => {
		setOfferAmount(amount);
		setHasOffered(true);
		setIsOfferModalOpen(false);
	};

	return (
		<>
			<ReportDetails
				status={status}
				reportId="BG-2026-001"
				specification="Apis cerana / Asian Honey Bee"
				location="Payatas, Quezon City"
				date="March 29, 2026"
				time="9:41 am"
				details="Near basketball court, on a mango tree."
				activity="Calm"
				danger="Yes"
			/>
			<div className="flex flex-col gap-1">
				<div className="flex flex-row items-center justify-between gap-1">
					<span className="Poppins-SemiBold text-[#817b70]">
						Reported By
					</span>
					{status === "pending" &&
						hasOffered &&
						offerAmount !== null && (
							<span className="Poppins-SemiBold text-[#817b70]">
								Amount Offer:{" "}
								<span className="text-[#ff9a00]">
									PHP {offerAmount.toLocaleString()}
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
								John Evans Gutierrez
							</h3>
							<p className="text-sm text-[#a6a3a3]">Citizen</p>
							{renderRated(status)}
						</div>
					</div>

					<div className="lg:ml-auto lg:pr-3 lg:w-auto w-full flex items-center gap-2">
						{renderActions(status, hasOffered, () =>
							setIsOfferModalOpen(true),
						)}
					</div>
				</div>
			</div>

			{/* nested modal — hindi galing sa global ModalContext,
			    kaya hindi na siya nagsasara ng BeeReport */}
			<ReportOfferModal
				isOpen={isOfferModalOpen}
				onClose={() => setIsOfferModalOpen(false)}
				onSubmit={handleOfferSubmit}
			/>
		</>
	);
};

export const BeeReport = ({ isOpen, onClose }: ReportModalProps) => {
	const isDesktop = useIsDesktop();
	const { payload } = useModal<ModalType, { status: string }>();

	if (!isOpen) return null;

	const status = (payload?.status ?? "pending") as ReportStatus;

	if (isDesktop) {
		return (
			<ModalContainer
				open={isOpen}
				width="lg:w-1/2 w-full"
				height="lg:h-5/6 h-full"
				header="Report Details"
				onClose={onClose}>
				<BeeReportContent status={status} />
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
				<BeeReportContent status={status} />
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
}: ReportOfferModalProps) => {
	const [amount, setAmount] = useState("");

	useEffect(() => {
		if (isOpen) setAmount("");
	}, [isOpen]);

	const parsed = Number(amount);
	const isValid = amount.trim() !== "" && !Number.isNaN(parsed) && parsed > 0;

	const handleSubmit = () => {
		if (!isValid) return;
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
					placeholder="Enter amount (PHP)"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
				/>
				<div className="w-full flex gap-3">
					<CancelButton onClick={onClose} />
					<Button
						label="Submit Offer"
						onClick={handleSubmit}
						disabled={!isValid}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};

// ===== CITIZEN SIDE ======
export const BeeIdentify = ({ isOpen, onClose }: ReportModalProps) => {
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
					Apis Cerana / Asian Honey Bee
				</span>

				<div className="text-[#00cc00] flex justify-center items-center gap-1 mt-3">
					<span className="Poppins-Bold text-6xl">97%</span>
					<div className="flex flex-col">
						<span className="Poppins-SemiBold text-2xl leading-4">
							Match
						</span>
						<span className="text-[#817b70] text-xs">
							High Confidence
						</span>
						<span className="text-[#817b70] text-xs flex items-center gap-1">
							Identification
							<Icon
								icon="akar-icons:circle-check-fill"
								className="text-[#00cc00]"
							/>
						</span>
					</div>
				</div>

				<div className="w-full flex gap-3 mt-5">
					<CancelButton onClick={onClose} />
					<Button label="Submit Photo" />
				</div>
			</div>
		</ModalContainer>
	);
};

// SWARM NOTICE
export const SwarmNotice = ({ isOpen, onClose }: ReportModalProps) => {
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

				<h3 className="Poppins-SemiBold text-xl text-[#4a2f00] mt-5">
					Do you wish to continue?
				</h3>

				<div className="w-full flex gap-3 mt-5">
					<CancelButton onClick={onClose} />
					<Button label="Continue" />
				</div>
			</div>
		</ModalContainer>
	);
};
