// components/modal/ReportModal.tsx

"use client";

import { useEffect, useState } from "react";
import { ModalContainer } from "./Modal";
import { Button, CancelButton } from "../ui/Button";
import { reportService } from "@/services/report";
import { Icon } from "@iconify/react";

type GenerateReportModalProps = {
	isOpen: boolean;
	onClose: () => void;
};

// ===== BEEKEEPER SIDE =====
/**
 * Replaces the old "confirm then immediately download" flow: this
 * modal fetches the PDF as a Blob, renders it in an <iframe> so the
 * beekeeper can preview it first, and only writes it to disk when
 * they explicitly click "Download" — no second network request needed
 * since we already have the Blob from the preview fetch.
 */
export const GenerateReportModal = ({
	isOpen,
	onClose,
}: GenerateReportModalProps) => {
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [blob, setBlob] = useState<Blob | null>(null);

	// Fetch a fresh preview every time the modal opens; revoke the
	// object URL on close so we don't leak memory across repeated opens.
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
			width="w-2/3"
			height="h-5/6"
			header="Yield History Report"
			onClose={onClose}>
			<div className="w-full flex-1 flex flex-col gap-3 min-h-0">
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
					// #toolbar=1&navpanes=0 keeps the toolbar (zoom/page
					// controls) but tells the browser's built-in PDF
					// viewer to collapse the page-thumbnail sidebar by
					// default, so only the main page shows.
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

// ===== CITIZEN SIDE ======
// BEE SPECIES IDENTIFY
export const BeeIdentify = ({ isOpen, onClose }: GenerateReportModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="w-1/4"
			header="Bee Species Identified!"
			onClose={onClose}>
			<div className="flex flex-col justify-center items-center">
				<span className="Poppins-SemiBold text-[#817b70] text-sm">
					You are seeing:
				</span>

				{/* BEE SPECIES NAME */}
				<span className="py-1 px-5 flex justify-center items-center border-2 border-[#ffce1c] rounded-lg text-center text-[#4a2f00] text-lg">
					Apis Cerana / Asian Honey Bee
				</span>

				{/* ACCURACY */}
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

				{/* BUTTON */}
				<div className="w-full flex gap-3 mt-5">
					<CancelButton onClick={onClose} />
					<Button label="Submit Photo" />
				</div>
			</div>
		</ModalContainer>
	);
};

// SWARM NOTICE
export const SwarmNotice = ({ isOpen, onClose }: GenerateReportModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="w-1/3"
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

				{/* BUTTON */}
				<div className="w-full flex gap-3 mt-5">
					<CancelButton onClick={onClose} />
					<Button label="Continue" />
				</div>
			</div>
		</ModalContainer>
	);
};
