"use client";

import { ProfilePhoto } from "@/components/ProfilePhoto";
import { Button, CancelButton } from "@/components/ui/Button";
import { StarRating } from "./ui/StarRating";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/services/api";

type ButtonVariant = "respond" | "message" | "resolved";

// Matches the offer shape returned by RescueOfferModel.find_with_context /
// list_by_report / list_for_citizen (see models/rescue_offer.py).
export type RescueOffer = {
	offer_id: string;
	report_id: string;
	beekeeperID: string;
	beekeeper_name: string;
	farm_name: string | null;
	offered_fee: number | string;
	offer_status: "Pending" | "Accepted" | "Rejected" | "Resolved";
	// Only on list_by_report — the citizen's existing rating, if any.
	my_rating?: number | null;
};

interface ButtonsProps {
	busy?: boolean;
	// Which irreversible action is waiting for its confirming 2nd tap.
	armed?: "cancel" | "resolve" | null;
	onAccept?: () => void;
	onReject?: () => void;
	onMessage?: () => void;
	onCancelReport?: () => void;
	onResolve?: () => void;
}

const BUTTON_CONFIG: Record<ButtonVariant, React.FC<ButtonsProps>> = {
	respond: ({ busy, onAccept, onReject }) => (
		<>
			<CancelButton
				BGcolor="bg-[#e2e2e6]"
				label="Reject"
				onClick={busy ? undefined : onReject}
				width="lg:w-30 w-full"
			/>
			<Button
				label={busy ? "…" : "Accept"}
				onClick={busy ? undefined : onAccept}
				width="lg:w-30 w-full"
			/>
		</>
	),
	message: ({ busy, armed, onMessage, onCancelReport, onResolve }) => (
		<>
			<CancelButton
				BGcolor={armed === "cancel" ? "bg-red-600" : "bg-[#e2e2e6]"}
				textColor={armed === "cancel" ? "white" : "#ff3131"}
				width="150px"
				label={armed === "cancel" ? "Tap to confirm" : "Cancel Report"}
				onClick={busy ? undefined : onCancelReport}
			/>
			<CancelButton
				BGcolor={armed === "resolve" ? "bg-[#1f6f5f]" : "bg-[#e2e2e6]"}
				textColor={armed === "resolve" ? "white" : "#1f6f5f"}
				width="150px"
				label={armed === "resolve" ? "Tap to confirm" : "Mark Resolved"}
				onClick={busy ? undefined : onResolve}
			/>
			<Button
				label={busy ? "…" : "Message"}
				onClick={busy ? undefined : onMessage}
				width="150px"
			/>
		</>
	),
	resolved: () => null, // handled separately below (needs rating state)
};

// Derives which button variant to show from the offer's real status,
// instead of the caller having to pass it separately and risk the two
// falling out of sync.
export const variantForOffer = (
	status: RescueOffer["offer_status"],
): ButtonVariant | undefined => {
	if (status === "Pending") return "respond";
	if (status === "Accepted") return "message";
	if (status === "Resolved") return "resolved";
	return undefined; // "Rejected" — nothing actionable left to show
};

type BeekeeperProps = {
	offer: RescueOffer;
	onUpdated?: (offer: RescueOffer) => void;
	// Cancels the whole report (handled by the Document page, which
	// owns the report). Returns an error message, or null on success.
	onCancelReport?: () => Promise<string | null>;
	// Static/demo mode: no API calls — every button just updates the
	// offer locally through onUpdated. Used while the Document page
	// runs on dummy data.
	demo?: boolean;
};

// Two-tap confirm window for Cancel / Mark Resolved.
const CONFIRM_MS = 4000;

export const Beekeeper = ({
	offer,
	onUpdated,
	onCancelReport,
	demo = false,
}: BeekeeperProps) => {
	const pathname = usePathname();
	const router = useRouter();
	// "citizen" | "beekeeper" — messages live under the role, e.g.
	// /citizen/messages (a bare /messages 404s).
	const role = pathname.split("/")[1] || "citizen";

	const [rating, setRating] = useState(0);
	const [submittedRating, setSubmittedRating] = useState<number | null>(
		offer.my_rating ?? null,
	);
	const [busy, setBusy] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [armed, setArmed] = useState<"cancel" | "resolve" | null>(null);

	// Disarm the confirm state if the second tap never comes.
	useEffect(() => {
		if (!armed) return;
		const t = setTimeout(() => setArmed(null), CONFIRM_MS);
		return () => clearTimeout(t);
	}, [armed]);

	const button = variantForOffer(offer.offer_status);
	if (!button) return null;

	const isResolved = button === "resolved";
	const alreadyRated = submittedRating !== null;
	const Variant = BUTTON_CONFIG[button];

	const respond = async (action: "accept" | "reject") => {
		if (busy) return;
		if (demo) {
			onUpdated?.({
				...offer,
				offer_status: action === "accept" ? "Accepted" : "Rejected",
			});
			return;
		}
		setBusy(true);
		setErrorMsg(null);
		const res = await api.patch<RescueOffer>(
			`/rescue-offers/${offer.offer_id}/respond`,
			{ action },
		);
		setBusy(false);
		if (res.success && res.data) {
			onUpdated?.(res.data);
		} else {
			setErrorMsg(res.message || `Couldn't ${action} this offer.`);
		}
	};

	const handleMessage = async () => {
		if (busy) return;
		if (demo) {
			router.push(`/${role}/messages`);
			return;
		}
		setBusy(true);
		setErrorMsg(null);
		const res = await api.post<{ chat_id: number }>("/chats/start", {
			other_id: offer.beekeeperID,
		});
		setBusy(false);
		if (res.success && res.data) {
			window.location.href = `/${role}/messages?chat=${res.data.chat_id}`;
		} else {
			setErrorMsg(res.message || "Couldn't open a conversation.");
		}
	};

	const handleCancelReport = async () => {
		if (busy || !onCancelReport) return;
		if (armed !== "cancel") {
			setArmed("cancel");
			return;
		}
		setArmed(null);
		setBusy(true);
		setErrorMsg(null);
		const err = await onCancelReport();
		setBusy(false);
		if (err) setErrorMsg(err);
	};

	const handleResolve = async () => {
		if (busy) return;
		if (armed !== "resolve") {
			setArmed("resolve");
			return;
		}
		setArmed(null);
		if (demo) {
			onUpdated?.({ ...offer, offer_status: "Resolved" });
			return;
		}
		setBusy(true);
		setErrorMsg(null);
		const res = await api.patch<RescueOffer>(
			`/rescue-offers/${offer.offer_id}/resolve`,
			{},
		);
		setBusy(false);
		if (res.success && res.data) {
			onUpdated?.(res.data);
		} else {
			setErrorMsg(res.message || "Couldn't mark this rescue as resolved.");
		}
	};

	const handleSubmitRating = async () => {
		if (!rating || busy) return;
		if (demo) {
			setSubmittedRating(rating);
			onUpdated?.({ ...offer, my_rating: rating });
			return;
		}
		setBusy(true);
		setErrorMsg(null);
		const res = await api.post("/ratings", {
			offer_id: offer.offer_id,
			rating_value: rating,
		});
		setBusy(false);
		if (res.success) {
			setSubmittedRating(rating);
			onUpdated?.({ ...offer, my_rating: rating });
		} else {
			setErrorMsg(res.message || "Couldn't submit your rating.");
		}
	};

	return (
		<div
			className={`w-full flex flex-col gap-1 p-2 transition-all duration-130 ease-in rounded-xl ${button === "message" ? "bg-[#fff1ad]/40 shadow-[0px_2px_5px_-1px_rgba(50,50,93,0.25),0px_1px_3px_-1px_rgba(0,0,0,0.3)]" : "hover:bg-[#fff1ad]/40"}`}>
			<div className="w-full flex lg:flex-row flex-col items-center gap-3">
				<div className="flex items-center justify-start w-full gap-2">
					{/* PROFILE */}
					<div className="w-15 h-15">
						<ProfilePhoto />
					</div>

					{/* NAME AND OFFER */}
					<div className="">
						<h3 className="Poppins-SemiBold text-base">
							{offer.beekeeper_name}
						</h3>
						{offer.farm_name && (
							<span className="block text-xs text-[#817b70]">
								{offer.farm_name}
							</span>
						)}
						<span className="text-sm text-[#a6a3a3]">
							Offer:{" "}
							<span className="text-[#ff9a00]">
								{/* The amount is optional — 0 means a free rescue. */}
								{Number(offer.offered_fee) > 0
									? `PHP ${Number(offer.offered_fee).toLocaleString()}`
									: "Free rescue"}
							</span>
						</span>

						{/* ONLY SHOW RATING WHEN RESOLVED */}
						{isResolved &&
							(alreadyRated ? (
								<div className="flex items-center gap-2">
									<StarRating
										value={submittedRating as number}
										onChange={() => {}}
									/>
									<span className="text-xs text-[#817b70]">
										Thanks for rating!
									</span>
								</div>
							) : (
								<StarRating value={rating} onChange={setRating} />
							))}
					</div>
				</div>

				{/* RIGHT SIDE BUTTONS */}
				<div className="lg:w-auto w-full ml-auto flex lg:flex-nowrap flex-wrap gap-2">
					{isResolved ? (
						!alreadyRated && (
							<Button
								label={busy ? "Submitting…" : "Submit"}
								onClick={handleSubmitRating}
								width="lg:w-30 w-full"
							/>
						)
					) : (
						<Variant
							busy={busy}
							armed={armed}
							onAccept={() => respond("accept")}
							onReject={() => respond("reject")}
							onMessage={handleMessage}
							onCancelReport={handleCancelReport}
							onResolve={handleResolve}
						/>
					)}
				</div>
			</div>

			{errorMsg && (
				<p className="text-xs text-red-600 text-right">{errorMsg}</p>
			)}
		</div>
	);
};