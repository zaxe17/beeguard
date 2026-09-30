// app/admin/profile/user/page.tsx — ONE USER'S DETAILS (opened by tapping a user in the list)

"use client";

import { formatPhMobile } from "@/lib/phone";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HiveTabs, mapHealthStatusToUi } from "@/components/HiveContainer";
import { NavTab } from "@/components/Tab";
import { BackButton, Button, CancelButton } from "@/components/ui/Button";
import { Container, FormContainer } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { ReportCard } from "@/components/ui/ReportCard";
import { VerifyStatus } from "@/components/ui/VerifyStatus";
import { Users } from "@/components/Users";
import {
	adminService,
	type AdminActivity,
	type AdminUserDetail,
} from "@/services/admin";
import { verificationService } from "@/services/verification";
import {
	formatDate,
	formatTime,
	reportImageSrc,
	toAdminUiStatus,
} from "@/services/citizenReport";
import type { ReportProps } from "@/components/ui/ReportCard";

const formatDay = (iso: string | null | undefined) =>
	iso
		? new Date(iso).toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			})
		: "—";

// A beekeeper's offer status as a report-card status.
const offerStatusToUi = (
	s: AdminActivity["offer_status"],
): ReportProps["status"] => {
	if (s === "Accepted") return "in-progress";
	if (s === "Resolved") return "resolved";
	if (s === "Rejected") return "cancelled"; // admin side: Cancelled, not Rejected
	return "pending";
};

// USER INFORMATION
const Information = ({
	detail,
	onStatusChanged,
}: {
	detail: AdminUserDetail;
	onStatusChanged: () => void;
}) => {
	const { user } = detail;
	const isActive = (user.status || "").toLowerCase() === "active";
	const [busy, setBusy] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const toggleStatus = async () => {
		setBusy(true);
		setErrorMsg(null);
		const res = await adminService.setStatus(
			user.role,
			user.id,
			isActive ? "Inactive" : "Active",
		);
		setBusy(false);
		if (res.success) onStatusChanged();
		else setErrorMsg(res.message || "Couldn't update the account.");
	};

	return (
		<FormContainer width="lg:w-1/3 w-full">
			<div className="flex flex-col gap-3">
				<Input label="Full Name" value={user.name ?? ""} disabled />
				<Input label="Username" value={user.username ?? ""} disabled />
				<Input label="Email" value={user.email ?? ""} disabled />
				<Input
					label="Contact No."
					value={formatPhMobile(user.contact_no)}
					disabled
				/>
				<Input label="Address" value={user.address ?? ""} disabled />
				<Input
					label="Joined"
					value={formatDay(user.created_at)}
					disabled
				/>

				{errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

				{/* BUTTON — inactive accounts can't log in */}
				<div className="flex gap-3 mt-5">
					<Button
						buttonType="button"
						label={
							busy
								? "Saving…"
								: isActive
									? "Deactivate Account"
									: "Activate Account"
						}
						bgNone={isActive}
						onClick={toggleStatus}
						disabled={busy}
					/>
				</div>
			</div>
		</FormContainer>
	);
};

// BEEKEEPER VERIFICATION — view document, approve / reject
const Verification = ({
	detail,
	onReviewed,
}: {
	detail: AdminUserDetail;
	onReviewed: () => void;
}) => {
	const { user } = detail;
	const [doc, setDoc] = useState<{ url: string; type: string } | null>(null);
	const [docError, setDocError] = useState<string | null>(null);
	const [loadingDoc, setLoadingDoc] = useState(false);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// Load the private document with the admin's token.
	useEffect(() => {
		if (!user.has_verification_document) return;
		let cancelled = false;
		let objectUrl: string | null = null;
		setLoadingDoc(true);
		setDocError(null);
		verificationService
			.fetchDocument(user.id)
			.then((d) => {
				objectUrl = d.url;
				if (!cancelled) setDoc(d);
			})
			.catch((e: Error) => {
				if (!cancelled) setDocError(e.message);
			})
			.finally(() => {
				if (!cancelled) setLoadingDoc(false);
			});
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [
		user.id,
		user.has_verification_document,
		user.verification_submitted_at,
	]);

	const approve = async () => {
		setBusy("approve");
		setErrorMsg(null);
		const res = await adminService.approve(user.id);
		setBusy(null);
		if (res.success) onReviewed();
		else setErrorMsg(res.message || "Couldn't approve.");
	};

	const reject = async () => {
		if (!reason.trim()) {
			setErrorMsg("Write a reason so the beekeeper knows what to fix.");
			return;
		}
		setBusy("reject");
		setErrorMsg(null);
		const res = await adminService.reject(user.id, reason.trim());
		setBusy(null);
		if (res.success) {
			setReason("");
			onReviewed();
		} else {
			setErrorMsg(res.message || "Couldn't reject.");
		}
	};

	const status = user.verification_status ?? "Unverified";

	return (
		<Container width="lg:w-2/3 w-full">
			<div className="flex lg:flex-row flex-col gap-5 h-full min-h-0 p-2">
				{/* DOCUMENT */}
				<div className="lg:w-1/2 w-full min-h-72 rounded-xl border border-[#e2e2e6] bg-[#f8f6ee] overflow-hidden flex items-center justify-center">
					{!user.has_verification_document ? (
						<p className="text-sm text-[#a6a3a3] p-5 text-center">
							No document uploaded yet.
						</p>
					) : loadingDoc ? (
						<p className="text-sm text-[#a6a3a3]">
							Loading document…
						</p>
					) : docError ? (
						<p className="text-sm text-red-600 p-5 text-center">
							{docError}
						</p>
					) : doc?.type === "application/pdf" ? (
						<iframe
							src={doc.url}
							title="Verification document"
							className="w-full h-full min-h-96"
						/>
					) : doc ? (
						<a
							href={doc.url}
							target="_blank"
							rel="noopener noreferrer"
							className="w-full h-full">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={doc.url}
								alt="Verification document"
								className="w-full h-full object-contain"
							/>
						</a>
					) : null}
				</div>

				{/* DETAILS + ACTIONS */}
				<div className="lg:w-1/2 w-full flex flex-col gap-3">
					<VerifyStatus status={status} />
					<Input
						label="Farm Name"
						value={user.farm_name ?? ""}
						disabled
					/>
					<Input
						label="Type of Document"
						value={user.verification_document_type ?? "—"}
						disabled
					/>
					<Input
						label="Submitted"
						value={formatDay(user.verification_submitted_at)}
						disabled
					/>
					{user.verification_reviewed_at && (
						<Input
							label="Reviewed"
							value={formatDay(user.verification_reviewed_at)}
							disabled
						/>
					)}
					{status === "Rejected" &&
						user.verification_rejection_reason && (
							<p className="text-xs text-red-600">
								Rejected: {user.verification_rejection_reason}
							</p>
						)}

					{user.has_verification_document &&
						status !== "Verified" && (
							<>
								<div className="flex flex-col gap-1">
									<label className="lg:text-base text-sm text-[#4a2f00]">
										Reason (needed to reject)
									</label>
									<textarea
										value={reason}
										maxLength={255}
										onChange={(e) =>
											setReason(e.target.value)
										}
										placeholder="e.g. The photo is blurry — please upload a clearer copy."
										className="text-sm w-full h-20 p-2.5 border border-[#a6a3a3] outline-0 rounded-lg bg-white/70 resize-none"
									/>
								</div>

								{errorMsg && (
									<p className="text-xs text-red-600">
										{errorMsg}
									</p>
								)}

								<div className="flex gap-3">
									<CancelButton
										label={
											busy === "reject"
												? "Rejecting…"
												: "Reject"
										}
										BGcolor="bg-[#e2e2e6]"
										textColor="#ff3131"
										onClick={busy ? undefined : reject}
									/>
									<Button
										buttonType="button"
										label={
											busy === "approve"
												? "Approving…"
												: "Approve"
										}
										onClick={approve}
										disabled={!!busy}
									/>
								</div>
							</>
						)}

					{status === "Verified" && (
						<p className="text-xs text-[#1f6f5f]">
							This beekeeper is verified and can view reports and
							send rescue offers.
						</p>
					)}
				</div>
			</div>
		</Container>
	);
};

// USER FARM AND HIVE DETAILS (beekeepers)
const FarmHives = ({ detail }: { detail: AdminUserDetail }) => {
	const { user, hives } = detail;
	return (
		<Container width="lg:w-3/4 w-full">
			<div className="flex flex-col gap-3 h-full min-h-0">
				<div className="w-full flex items-center justify-start">
					<div className="lg:w-1/3 w-full">
						<Input
							label="Farm Name"
							value={user.farm_name ?? ""}
							disabled
						/>
						<Input
							label="Apiary Type"
							value={user.apiary_type ?? ""}
							disabled
						/>
					</div>
				</div>

				{hives.length === 0 && (
					<p className="text-sm text-[#a6a3a3] text-center py-4">
						No hives added yet.
					</p>
				)}

				<div className="lg:p-2 p-0 grid lg:grid-cols-2 grid-cols-1 flex-1 gap-3 overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					{hives.map((h) => (
						<HiveTabs
							key={h.hive_id}
							hiveId={h.hive_id}
							hive={h.hive_name}
							location={h.bee_species}
							lastCheck={formatDay(h.last_check)}
							status={mapHealthStatusToUi(
								// hives.health_status only holds the values the
								// hive CHECK allows, so it's a valid HealthStatus.
								h.health_status as Parameters<
									typeof mapHealthStatusToUi
								>[0],
							)}
							yieldThisMonth={`${Number(h.yield_this_month ?? 0).toFixed(1)}kg`}
							hiveState={h.hive_state}
						/>
					))}
				</div>
			</div>
		</Container>
	);
};

// USER ACTIVITY — citizen: their reports; beekeeper: their rescue offers
const Activity = ({ detail }: { detail: AdminUserDetail }) => {
	const isBeekeeper = detail.user.role === "beekeeper";
	return (
		<Container width="lg:w-1/2 w-full">
			<div className="flex flex-col gap-3 h-full min-h-0">
				<div className="lg:p-2 p-0 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 lg:scrollbar-auto scrollbar-none">
					{detail.activity.length === 0 && (
						<p className="text-sm text-[#a6a3a3] text-center py-4">
							No activity yet.
						</p>
					)}
					{detail.activity.map((a) => {
						const when = a.sighted_at ?? a.reported_at;
						return (
							<ReportCard
								key={a.offer_id ?? a.reportID}
								status={
									isBeekeeper
										? offerStatusToUi(a.offer_status)
										: toAdminUiStatus(a.status)
								}
								reportId={a.reportID}
								latitude={a.latitude}
								longitude={a.longitude}
								date={formatDate(when)}
								time={
									isBeekeeper
										? `${formatTime(when)} • offer ${
												Number(a.offered_fee ?? 0) > 0
													? `₱${Number(a.offered_fee).toLocaleString()}`
													: "free"
											}`
										: formatTime(when)
								}
								imageUrl={reportImageSrc(a.image_url)}
							/>
						);
					})}
				</div>
			</div>
		</Container>
	);
};

// Remembers which user is open, in case switching tabs rewrites the
// address without ?role=&id= (depends on how NavTab builds its links).
const LAST_USER_KEY = "beeguard:admin-last-user";

const useSelectedUser = () => {
	const searchParams = useSearchParams();
	const role = searchParams.get("role") || "";
	const id = searchParams.get("id") || "";

	if (role && id) {
		try {
			sessionStorage.setItem(LAST_USER_KEY, JSON.stringify({ role, id }));
		} catch {
			/* storage unavailable — fine */
		}
		return { role, id };
	}
	try {
		const saved = JSON.parse(
			sessionStorage.getItem(LAST_USER_KEY) || "null",
		);
		if (saved?.role && saved?.id)
			return { role: String(saved.role), id: String(saved.id) };
	} catch {
		/* ignore */
	}
	return { role: "", id: "" };
};

const UserInner = () => {
	const searchParams = useSearchParams();
	const { role, id } = useSelectedUser();
	const activeTab = searchParams.get("tab") || "information";

	const [detail, setDetail] = useState<AdminUserDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!role || !id) {
			setErrorMsg("No user selected.");
			setLoading(false);
			return;
		}
		const res = await adminService.user(role, id);
		if (res.success && res.data) {
			setDetail(res.data);
			setErrorMsg(null);
		} else {
			setErrorMsg(res.message || "Couldn't load this user.");
		}
		setLoading(false);
	}, [role, id]);

	useEffect(() => {
		setLoading(true);
		load();
	}, [load]);

	const isBeekeeper = detail?.user.role === "beekeeper";
	const tabs = [
		{ label: "Personal Information", value: "information" },
		...(isBeekeeper
			? [
					{ label: "Verification", value: "verification" },
					{ label: "Farm & Hives", value: "farmhive" },
				]
			: []),
		{ label: "Activity", value: "activity" },
	];

	if (loading) {
		return (
			<div className="p-10 text-center text-sm text-[#a6a3a3]">
				Loading user…
			</div>
		);
	}
	if (!detail) {
		return (
			<div className="p-10 text-center text-sm text-red-600">
				{errorMsg}
			</div>
		);
	}

	const { user } = detail;

	return (
		<div className="p-4 flex flex-col w-full h-screen min-h-0 overflow-hidden">
			<div className="lg:w-1/3 w-full shrink-0">
				<BackButton label="Go Back" route="/admin/profile" />
				<Users
					name={user.name}
					role={user.role}
					email={user.email}
					phoneNo={user.contact_no ?? ""}
					status={
						(user.status || "").toLowerCase() as
							| "active"
							| "inactive"
					}
				/>
			</div>

			<div className="w-full flex-1 min-h-0 flex flex-col items-center">
				<div className="w-full h-full min-h-0 flex flex-col items-center">
					<div className="lg:w-2/3 w-full">
						<NavTab tabs={tabs} />
					</div>

					<div className="w-full flex-1 min-h-0 flex flex-col justify-start items-center lg:mt-10 lg:scrollbar-auto scrollbar-none">
						{activeTab === "information" && (
							<Information
								detail={detail}
								onStatusChanged={load}
							/>
						)}
						{activeTab === "verification" && isBeekeeper && (
							<Verification detail={detail} onReviewed={load} />
						)}
						{activeTab === "farmhive" && isBeekeeper && (
							<FarmHives detail={detail} />
						)}
						{activeTab === "activity" && (
							<Activity detail={detail} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

const User = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<UserInner />
		</Suspense>
	);
};

export default User;
