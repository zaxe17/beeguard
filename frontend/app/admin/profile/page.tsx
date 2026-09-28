// app/admin/profile/page.tsx — admin USERS LIST (tabs: All / Citizens / Beekeepers / Pending Verification)

"use client";

import { NavTab } from "@/components/Tab";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { Users } from "@/components/Users";
import { SearchBar } from "@/components/ui/Input";
import { FilterContainer } from "@/components/popup/Filter";
import Link from "next/link";
import { adminService, type AdminUsersResponse } from "@/services/admin";

// Filter icon options (components/popup/Filter.tsx).
type UserFilter = "all" | "active" | "inactive" | "verified" | "unverified" | "newest" | "oldest" | "name";
const FILTER_OPTIONS: { label: string; value: UserFilter }[] = [
	{ label: "All Users", value: "all" },
	{ label: "Active", value: "active" },
	{ label: "Inactive", value: "inactive" },
	{ label: "Verified Beekeepers", value: "verified" },
	{ label: "Not Verified Beekeepers", value: "unverified" },
	{ label: "Newest First", value: "newest" },
	{ label: "Oldest First", value: "oldest" },
	{ label: "Name (A–Z)", value: "name" },
];

// Wait this long after typing before searching.
const SEARCH_DEBOUNCE_MS = 300;

const ProfileContainerInner = () => {
	const searchParams = useSearchParams();
	const activeTab = searchParams.get("tab") || "all";

	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<UserFilter>("all");
	const [data, setData] = useState<AdminUsersResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		const t = setTimeout(async () => {
			const res = await adminService.users({ role: activeTab, search });
			if (cancelled) return;
			if (res.success && res.data) {
				setData(res.data);
				setErrorMsg(null);
			} else {
				setErrorMsg(res.message || "Couldn't load users.");
			}
			setLoading(false);
		}, search ? SEARCH_DEBOUNCE_MS : 0);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [activeTab, search]);

	const counts = data?.counts;
	const tabs = [
		{ label: `All (${(counts?.all ?? 0).toLocaleString()})`, value: "all" },
		{ label: `Citizens (${(counts?.citizens ?? 0).toLocaleString()})`, value: "citizen" },
		{ label: `Beekeepers (${(counts?.beekeepers ?? 0).toLocaleString()})`, value: "beekeeper" },
		// NEW — beekeepers waiting for admin review.
		{
			label: `Pending Verification (${(counts?.pending_verifications ?? 0).toLocaleString()})`,
			value: "verification",
		},
	];

	// Filter icon: narrow down, or change the order (list is newest first).
	const users = (() => {
		let list = data?.users ?? [];
		switch (filter) {
			case "active":
				list = list.filter((u) => (u.status || "").toLowerCase() === "active");
				break;
			case "inactive":
				list = list.filter((u) => (u.status || "").toLowerCase() === "inactive");
				break;
			case "verified":
				list = list.filter((u) => u.role === "beekeeper" && u.verification_status === "Verified");
				break;
			case "unverified":
				list = list.filter((u) => u.role === "beekeeper" && u.verification_status !== "Verified");
				break;
			case "oldest":
				list = [...list].sort(
					(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
				);
				break;
			case "name":
				list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
				break;
			// "all" / "newest": the server already sends newest first
		}
		return list;
	})();

	return (
		<div className="h-screen pt-10 flex justify-center px-5 overflow-hidden">
			<div className="lg:w-1/2 w-full flex flex-col min-h-0">
				<div className="flex justify-end items-center gap-3 mb-8">
					{/* SEARCHBAR */}
					<div className="lg:w-1/3 w-full">
						<SearchBar
							placeholder="Search Users"
							value={search}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setSearch(e.target.value)
							}
						/>
					</div>

					{/* FILTER ICON */}
					<FilterContainer
						title="Show"
						label={FILTER_OPTIONS}
						value={filter}
						onChange={(v) => setFilter(v as UserFilter)}
					/>
				</div>

				{/* TABS */}
				<NavTab tabs={tabs} hasBg />

				<div className="flex-1 min-h-0 flex flex-col scroll-container overflow-y-auto lg:px-3 px-0 my-5 lg:scrollbar-auto scrollbar-none">
					<div className="mt-5 flex flex-col gap-3 pb-3">
						{loading && (
							<p className="text-center text-sm text-[#a6a3a3] py-4">Loading users…</p>
						)}
						{!loading && errorMsg && (
							<p className="text-center text-sm text-red-600 py-4">{errorMsg}</p>
						)}
						{!loading && !errorMsg && users.length === 0 && (
							<p className="text-center text-sm text-[#a6a3a3] py-4">
								{activeTab === "verification"
									? "No beekeepers are waiting for verification."
									: filter !== "all"
										? `No users under "${FILTER_OPTIONS.find((o) => o.value === filter)?.label}".`
										: "No users found."}
							</p>
						)}

						{users.map((u) => (
							<Link
								key={`${u.role}-${u.id}`}
								href={`/admin/profile/user?role=${u.role}&id=${encodeURIComponent(u.id)}${
									u.verification_status === "Pending" ? "&tab=verification" : ""
								}`}>
								<Users
									name={u.name}
									role={u.role}
									email={u.email}
									phoneNo={u.contact_no ?? ""}
									status={(u.status || "").toLowerCase() as "active" | "inactive"}
									photo={u.profile_photo}
								/>
							</Link>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

const Profile = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<ProfileContainerInner />
		</Suspense>
	);
};

export default Profile;