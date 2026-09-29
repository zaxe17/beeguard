"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/ui/Input";

import { Icon } from "@iconify/react";
import { PesticideAlert, ALERT_PIN_COLORS } from "@/components/ui/Alert";
import { NavTab } from "@/components/Tab";
import { useModal } from "@/context/ModalContext";
import { ALERTS_CHANGED_EVENT } from "@/components/modal/AlertModal";
import { pesticideService, type AdminAlertRecord } from "@/services/pesticide";
import { useAlertLocations, getAlertLocation } from "@/hooks/useAlertLocation";
import type { AlertPin } from "@/components/ui/google-maps/Map";

type ModalType = "addAlert";
type RiskStatus = "high" | "medium" | "low";

// New beekeeper alerts show up without a page refresh.
const LIST_POLL_MS = 30000;
const REASON_MAX = 255;

const Map = dynamic(() => import("@/components/ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

const toRisk = (a: AdminAlertRecord): RiskStatus =>
	(a.risk_level || "Medium").toLowerCase() as RiskStatus;

const formatDate = (iso: string | null | undefined) =>
	iso
		? new Date(iso).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "—";

const formatTime = (iso: string | null | undefined) =>
	iso
		? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		: "—";

const isActive = (a: AdminAlertRecord) =>
	!a.expiration_date || new Date(a.expiration_date).getTime() >= Date.now();

// One row in the review panel.
const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
	<div className="flex justify-between items-start gap-3 text-xs">
		<span className="text-[#817b70] shrink-0">{label}</span>
		<span className="Poppins-SemiBold text-right wrap-break-word">{value || "—"}</span>
	</div>
);

// Details of the selected alert + Approve / Reject for pending ones.
const ReviewPanel = ({
	alert,
	location,
	onClose,
	onReviewed,
}: {
	alert: AdminAlertRecord;
	location: string;
	onClose: () => void;
	onReviewed: (message: string) => void;
}) => {
	const [rejecting, setRejecting] = useState(false);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// Reset the form when another alert is opened.
	useEffect(() => {
		setRejecting(false);
		setReason("");
		setErrorMsg(null);
	}, [alert.alert_id]);

	const approve = async () => {
		setBusy("approve");
		setErrorMsg(null);
		const res = await pesticideService.approveAlert(alert.alert_id);
		setBusy(null);
		if (!res.success) {
			setErrorMsg(res.message || "Couldn't approve this alert.");
			return;
		}
		onReviewed(res.message || "Alert approved.");
	};

	const reject = async () => {
		if (!reason.trim()) {
			setErrorMsg("Please give a reason so the beekeeper knows what to fix.");
			return;
		}
		setBusy("reject");
		setErrorMsg(null);
		const res = await pesticideService.rejectAlert(alert.alert_id, reason.trim());
		setBusy(null);
		if (!res.success) {
			setErrorMsg(res.message || "Couldn't reject this alert.");
			return;
		}
		onReviewed(res.message || "Alert rejected.");
	};

	const isPending = alert.approval_status === "Pending";
	const reporter =
		alert.source === "beekeeper"
			? `${alert.reporter_name ?? "Beekeeper"}${alert.reporter_farm ? ` (${alert.reporter_farm})` : ""}`
			: `${alert.admin_name ?? "Admin"} (Admin)`;

	return (
		<div className="w-full bg-white border-t border-[#e2e2e6] p-4 flex flex-col gap-3 max-h-[55%] overflow-y-auto">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="Poppins-Bold text-base text-[#4a2f00] line-clamp-1">
						{alert.title}
					</h3>
					<p className="text-xs text-[#817b70] line-clamp-1">{location}</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span
						className={`Poppins-SemiBold text-[10px] py-1 px-2 rounded-full ${
							alert.approval_status === "Pending"
								? "bg-[#ffdb4f]/40 text-[#854F0B]"
								: alert.approval_status === "Rejected"
									? "bg-red-600/15 text-red-600"
									: "bg-[#8ac44f]/20 text-[#1f6f5f]"
						}`}>
						{alert.approval_status === "Pending"
							? "Waiting for approval"
							: alert.approval_status}
					</span>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="text-[#a6a3a3] hover:text-[#817b70]">
						<Icon icon="mdi:close" className="w-5 h-5" />
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<InfoRow label="Reported by" value={reporter} />
				{alert.source === "beekeeper" && (
					<InfoRow label="Contact" value={alert.reporter_contact} />
				)}
				<InfoRow label="Pesticide type" value={alert.pesticide_type} />
				<InfoRow
					label="Scheduled"
					value={`${formatDate(alert.scheduled_date)} • ${formatTime(alert.scheduled_date)}`}
				/>
				<InfoRow label="Danger radius" value={`${Number(alert.danger_radius_km)} km`} />
				{/* 14-day validity: after this date the alert moves to History. */}
				{alert.expiration_date && (
					<InfoRow
						label={isActive(alert) ? "Active until" : "Ended"}
						value={`${formatDate(alert.expiration_date)} • ${formatTime(alert.expiration_date)}`}
					/>
				)}
				{/* Highest risk any beekeeper faces (each beekeeper sees
				    their own level based on their farm's distance). */}
				<InfoRow
					label={isPending ? "Highest risk (if approved)" : "Highest risk"}
					value={alert.risk_level}
				/>
				<InfoRow
					label="Submitted"
					value={`${formatDate(alert.created_at)} • ${formatTime(alert.created_at)}`}
				/>
				{alert.description && <InfoRow label="Description" value={alert.description} />}
				{alert.approval_status === "Rejected" && (
					<InfoRow label="Rejection reason" value={alert.rejection_reason} />
				)}
			</div>

			{isPending && (
				<div className="flex flex-col gap-2 pt-1">
					{rejecting && (
						<div className="flex flex-col gap-1">
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
								rows={2}
								placeholder="Why is this alert being rejected? (the beekeeper will see this)"
								className="w-full text-xs border border-[#e2e2e6] rounded-lg p-2 outline-none focus:border-[#ffce1c] resize-none"
							/>
							<span className="text-[10px] text-[#a6a3a3] text-right">
								{reason.length}/{REASON_MAX}
							</span>
						</div>
					)}

					{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

					<div className="flex items-center gap-2">
						{rejecting ? (
							<>
								<button
									type="button"
									disabled={!!busy}
									onClick={() => {
										setRejecting(false);
										setErrorMsg(null);
									}}
									className="flex-1 Poppins-SemiBold text-xs py-2 rounded-lg border border-[#a6a3a3] text-[#817b70] disabled:opacity-50">
									Back
								</button>
								<button
									type="button"
									disabled={!!busy}
									onClick={reject}
									className="flex-1 Poppins-SemiBold text-xs py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">
									{busy === "reject" ? "Rejecting..." : "Confirm Reject"}
								</button>
							</>
						) : (
							<>
								<button
									type="button"
									disabled={!!busy}
									onClick={() => setRejecting(true)}
									className="flex-1 Poppins-SemiBold text-xs py-2 rounded-lg border border-red-600 text-red-600 disabled:opacity-50">
									Reject
								</button>
								<button
									type="button"
									disabled={!!busy}
									onClick={approve}
									className="flex-1 Poppins-SemiBold text-xs py-2 rounded-lg bg-[#8ac44f] text-white disabled:opacity-50">
									{busy === "approve" ? "Approving..." : "Approve & Send"}
								</button>
							</>
						)}
					</div>
					<p className="text-[10px] text-[#a6a3a3]">
						Approving sends this alert to every beekeeper and shows it on their
						Alerts page.
					</p>
				</div>
			)}
		</div>
	);
};

const AlertInner = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const activeTab = searchParams.get("tab") || "all";
	const { openModal } = useModal<ModalType>();

	const [alerts, setAlerts] = useState<AdminAlertRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const load = useCallback(async () => {
		const res = await pesticideService.listForReview("all");
		if (res.success && res.data) {
			setAlerts(res.data);
			setErrorMsg(null);
		} else {
			setErrorMsg(res.message || "Couldn't load alerts.");
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
		const interval = setInterval(load, LIST_POLL_MS);
		window.addEventListener(ALERTS_CHANGED_EVENT, load);
		return () => {
			clearInterval(interval);
			window.removeEventListener(ALERTS_CHANGED_EVENT, load);
		};
	}, [load]);

	// Hide the "approved/rejected" message after a few seconds.
	useEffect(() => {
		if (!notice) return;
		const t = setTimeout(() => setNotice(null), 5000);
		return () => clearTimeout(t);
	}, [notice]);

	const resolvedLocations = useAlertLocations(alerts);
	const locationOf = useCallback(
		(a: AdminAlertRecord) => getAlertLocation(a, resolvedLocations),
		[resolvedLocations],
	);

	const pending = alerts.filter((a) => a.approval_status === "Pending");
	const rejected = alerts.filter((a) => a.approval_status === "Rejected");
	// All / High / Medium / Low = approved alerts that haven't expired.
	const live = alerts.filter((a) => a.approval_status === "Approved" && isActive(a));
	// History = approved alerts whose 14-day validity already ended.
	const history = alerts.filter((a) => a.approval_status === "Approved" && !isActive(a));

	const tabs = [
		{ label: "All", value: "all" },
		{ label: "High", value: "high" },
		{ label: "Medium", value: "medium" },
		{ label: "Low", value: "low" },
		{ label: `Pending (${pending.length})`, value: "pending" },
		{ label: "Rejected", value: "rejected" },
		{ label: "History", value: "history" },
	];

	const filtered = useMemo(() => {
		let list: AdminAlertRecord[];
		if (activeTab === "pending") list = pending;
		else if (activeTab === "rejected") list = rejected;
		else if (activeTab === "history") list = history;
		else if (activeTab === "all") list = live;
		else list = live.filter((a) => toRisk(a) === activeTab);

		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter((a) =>
				[a.title, locationOf(a), a.reporter_name, a.pesticide_type, a.admin_name]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q)),
			);
		}
		return list;
	}, [activeTab, pending, rejected, live, history, search, locationOf]);

	const selected = alerts.find((a) => a.alert_id === selectedId) ?? null;

	// MAP — every alert in the current tab (All = all live alerts, High /
	// Medium / Low = only that risk, Pending / Rejected = those), each with
	// its risk color and danger radius. Follows the search box too.
	const mapPins = useMemo<AlertPin[]>(
		() =>
			filtered
				.map((a) => ({
					id: a.alert_id,
					lat: Number(a.latitude),
					lng: Number(a.longitude),
					radiusKm: Number(a.danger_radius_km) || null,
					color: ALERT_PIN_COLORS[toRisk(a)],
				}))
				.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
		[filtered],
	);

	const searchBar = (
		<SearchBar
			placeholder="Search Alerts"
			value={search}
			onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
		/>
	);

	const addButton = (
		<div
			onClick={() => openModal("addAlert")}
			className="w-8 h-8 shrink-0 bg-[#ffdb4f] rounded-full cursor-pointer">
			<Icon icon="tdesign:add" className="w-8 h-8 text-white" />
		</div>
	);

	return (
		<div className="w-full h-full flex items-start lg:flex-row flex-col-reverse">
			{/* CONTAINER FOR ALERT LIST */}
			<Container
				borderNone
				className="lg:w-[35%] w-full flex-1 lg:flex-none lg:h-full">
				<div className="relative w-full pt-5 px-2 lg:flex hidden items-center justify-end gap-3 mb-3">
					<div className="flex items-center gap-3">
						{/* ADD BUTTON */}
						{addButton}

						{/* SEARCHBAR ALERTS */}
						{searchBar}
					</div>
				</div>

				<NavTab tabs={tabs} hasBg />

				{/* Beekeeper alerts waiting for review */}
				{pending.length > 0 && activeTab !== "pending" && (
					<div className="mx-2 mt-2 bg-[#FAEEDA] border-2 border-[#FAC775] rounded-lg p-2 flex items-center gap-2">
						<Icon icon="mdi:clock-alert-outline" className="w-5 h-5 shrink-0 text-[#854F0B]" />
						<p className="Poppins-SemiBold text-[#854F0B] text-xs">
							{pending.length} alert{pending.length === 1 ? " is" : "s are"} waiting
							for approval.
						</p>
						<span
							onClick={() => router.push("/admin/alert?tab=pending")}
							className="Poppins-SemiBold text-xs text-[#854F0B] underline cursor-pointer ml-auto shrink-0">
							Review now
						</span>
					</div>
				)}

				{notice && (
					<p className="mx-2 mt-2 text-xs text-[#1f6f5f] bg-[#8ac44f]/20 rounded-md p-2">
						{notice}
					</p>
				)}

				{/* SCROLLABLE ALERT CARDS */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					{loading ? (
						<p className="text-center text-sm text-[#a6a3a3] py-4">Loading alerts…</p>
					) : errorMsg ? (
						<p className="text-center text-sm text-red-600 py-4">{errorMsg}</p>
					) : filtered.length > 0 ? (
						filtered.map((a) => (
							<PesticideAlert
								key={a.alert_id}
								location={locationOf(a)}
								date={formatDate(a.scheduled_date)}
								time={formatTime(a.scheduled_date)}
								status={toRisk(a)}
								approvalStatus={a.approval_status}
								selected={a.alert_id === selectedId}
								onClick={() => setSelectedId(a.alert_id)}
							/>
						))
					) : (
						<div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
							<Icon
								icon="famicons:notifications-off"
								className="w-20 h-20 text-[#a6a3a3]"
							/>
							<h2 className="w-1/2 Poppins-SemiBold text-x text-[#817b70]">
								{activeTab === "pending"
									? "No alerts waiting for approval"
									: activeTab === "history"
										? "No ended alerts yet"
										: "No alerts"}
							</h2>
						</div>
					)}
				</div>
			</Container>

			{/* min-w-0 + overflow-hidden: the map can never push the page
			    wider than the screen (no sideways scrolling). */}
			<div className="flex-1 w-full min-w-0 overflow-hidden lg:h-full z-0">
				<div className="flex flex-col h-full">
					{/* LOCATION MAP */}
					<div className="relative w-full py-2 px-2 lg:hidden flex items-center justify-end gap-3">
						<div className="w-full flex items-center gap-3">
							{/* ADD BUTTON */}
							{addButton}

							{/* SEARCHBAR ALERTS */}
							{searchBar}
						</div>
					</div>
					<div className="relative flex-1 min-h-60 min-w-0 overflow-hidden isolate">
						<Map
							// All alerts in this tab; red = High, orange =
							// Medium, green = Low. Tap a pin to open it.
							alertPins={mapPins}
							selectedAlertId={
								selected && mapPins.some((p) => p.id === selected.alert_id)
									? selected.alert_id
									: null
							}
							onAlertClick={(id) => setSelectedId(id)}
						/>
					</div>

					{/* DETAILS + APPROVE / REJECT */}
					{selected && (
						<ReviewPanel
							alert={selected}
							location={locationOf(selected)}
							onClose={() => setSelectedId(null)}
							onReviewed={(message) => {
								setNotice(message);
								setSelectedId(null);
								load();
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

const AlertLocation = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<AlertInner />
		</Suspense>
	);
};

export default AlertLocation;