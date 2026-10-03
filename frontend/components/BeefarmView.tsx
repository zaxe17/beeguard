"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { VerifyStatus } from "./ui/VerifyStatus";
import { Button } from "./ui/Button";
import { ProfilePhoto } from "./ProfilePhoto";

import beefarm from "../public/assets/farms/farm1.jpg";
import { RateCard } from "./ui/Card";
import { Icon } from "@iconify/react";
import { api } from "@/services/api";
import { mediaSrc } from "@/services/profile";
import { BeefarmViewSkeleton } from "./loading/SkeletonLoading";

// Shape returned by GET /api/farms/<beekeeperID> — see farm_service.py
type FarmDetail = {
	beekeeperID: string;
	name: string;
	farmName: string;
	location: string;
	apiary_type: string | null;
	verification_status: string | null;
	image: string | null; // bee farm photo (null = default cover)
	profile_photo: string | null; // the beekeeper's own photo
	rescued: number;
	hives: number;
	rating_avg: number;
	rating_count: number;
	// NEW — migration 008 (follows table)
	follower_count: number;
	is_following: boolean;
};

type BeefarmViewProps = {
	farmId: string;
};

const BeefarmView = ({ farmId }: BeefarmViewProps) => {
	const pathname = usePathname();
	// "citizen" | "beekeeper" | "admin" — same pattern ChatPage.tsx
	// uses to build role-scoped routes. Message redirects to
	// `/${role}/messages`, not a bare `/messages` (which 404s).
	const role = pathname.split("/")[1] || "citizen";
	// NEW — a beekeeper only sees this on THEIR OWN farm (Profile -> View
	// Profile -> My Bee Farm), so Message / Follow are hidden there.
	// Citizens (Bee Farm page) still get both buttons.
	const showActions = role === "citizen";

	const [farm, setFarm] = useState<FarmDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [following, setFollowing] = useState(false);
	const [followBusy, setFollowBusy] = useState(false);
	const [messageBusy, setMessageBusy] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);

		api.get<FarmDetail>(`/farms/${farmId}`).then((res) => {
			if (cancelled) return;
			if (res.success && res.data) {
				setFarm(res.data);
				setFollowing(res.data.is_following);
			}
			setLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [farmId]);

	if (loading) {
		return <BeefarmViewSkeleton showActions={showActions} />;
	}

	if (!farm) {
		return (
			<div className="w-full flex-1 flex items-center justify-center text-[#a6a3a3] text-sm p-6">
				Farm not found.
			</div>
		);
	}

	const ratingRounded = Math.round(farm.rating_avg);

	const handleMessage = async () => {
		if (messageBusy) return;
		setMessageBusy(true);
		setActionError(null);
		const res = await api.post<{ chat_id: number }>("/chats/start", {
			other_id: farm.beekeeperID,
		});
		setMessageBusy(false);
		if (res.success && res.data) {
			// FIXED — was a hardcoded "/messages" (404s: your actual
			// route is nested under the role, e.g. "/citizen/messages").
			window.location.href = `/${role}/messages?chat=${res.data.chat_id}`;
		} else {
			// FIXED — previously failed completely silently (e.g. when
			// not logged in), which looked identical to "the button
			// doesn't work." Now it actually tells you why.
			setActionError(
				res.message ||
					"Couldn't start a conversation. Are you logged in?",
			);
		}
	};

	const handleFollowToggle = async () => {
		if (followBusy) return;
		setFollowBusy(true);
		setActionError(null);
		const res = following
			? await api.delete(`/follows/${farm.beekeeperID}`)
			: await api.post(`/follows/${farm.beekeeperID}`, {});
		setFollowBusy(false);
		if (res.success) {
			setFollowing(!following);
		} else {
			setActionError(
				res.message ||
					"Couldn't update follow status. Are you logged in?",
			);
		}
	};

	return (
		<div className="w-full flex-1 overflow-scroll scrollbar-none lg:pb-10 pb-0">
			<div className="relative w-full lg:h-60 h-50">
				{/* COVER PHOTO — the beekeeper's farm photo, or the default */}
				{mediaSrc(farm.image) ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={mediaSrc(farm.image)}
						alt="cover_photo"
						className="absolute inset-0 w-full h-full object-cover"
					/>
				) : (
					<div className="absolute bg-[#ffdb4f]/20 w-full h-full"></div>
				)}

				<div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

				{/* PROFILE PICTURE */}
				<div className="hidden lg:block absolute left-4 lg:-bottom-15 -bottom-15 lg:w-30 w-20 lg:h-30 h-20 rounded-full overflow-hidden border-4 border-white shadow-md">
					<ProfilePhoto src={farm.profile_photo} />
				</div>
			</div>

			<div className="flex justify-between lg:flex-row flex-col gap-3 px-4 pt-2">
				{/* LEFT SIDE */}
				<div className="w-full">
					{/* NAME, VERIFY STATUS */}
					<div className="flex justify-start items-center gap-3 w-full lg:pl-33 pl-0">
						{/* PROFILE PICTURE */}
						<div className="block lg:hidden w-20 h-20 shrink-0 aspect-square rounded-full overflow-hidden border-4 border-white shadow-md">
							<ProfilePhoto src={farm.profile_photo} />
						</div>
						{/* DISPLAY NAME AND VERIFY STATUS */}
						<div className="flex flex-col">
							<span className="Poppins-SemiBold text-black text-2xl">
								{farm.name}
							</span>

							{/* VERIFY STATUS TO ONLY VISIBLE IF NOT VERIFY TO FIX THE BLOCK */}
							<div
								className={
									farm.verification_status === "Verified"
										? ""
										: "invisible"
								}>
								<VerifyStatus />
							</div>
						</div>
					</div>

					{/* STAR RATE */}
					<div className="flex items-center mt-2">
						{[1, 2, 3, 4, 5].map((i) => (
							<div className="w-6 h-6" key={i}>
								<Icon
									icon={
										i <= ratingRounded
											? "material-symbols:star-rounded"
											: "material-symbols:star-outline-rounded"
									}
									className="w-full h-full text-[#fbca42]"
								/>
							</div>
						))}

						<span className="pl-3 text-base text-[#a6a3a3]">
							{farm.rating_avg.toFixed(1)} ({farm.rating_count}{" "}
							reviews)
						</span>
					</div>

					{/* STATUS RATES */}
					<div className="w-full flex gap-3 mt-3">
						<RateCard
							total={String(farm.rescued)}
							title="Rescued"
						/>
						<RateCard total={String(farm.hives)} title="Hives" />
						<RateCard
							total={farm.rating_avg.toFixed(1)}
							title="Ratings"
						/>
						<RateCard
							total={String(farm.follower_count)}
							title={
								farm.follower_count === 0 ||
								farm.follower_count === 1
									? "Follower"
									: "Followers"
							}
						/>
					</div>
				</div>

				{/* RIGHT SIDE */}
				<div className="lg:w-2/3 w-full">
					{/* BUTTONS — citizens only (hidden on the beekeeper's own profile) */}
					{showActions && (
						<div className="flex gap-2 mt-3">
							<Button
								width="100%"
								buttonType="button"
								label={messageBusy ? "Starting…" : "Message"}
								bgNone
								disabled={messageBusy}
								onClick={handleMessage}
							/>
							<Button
								width="100%"
								buttonType="button"
								label={
									followBusy
										? "…"
										: following
											? "Following"
											: "Follow"
								}
								bgNone={following}
								disabled={followBusy}
								onClick={handleFollowToggle}
							/>
						</div>
					)}

					{actionError && (
						<p className="text-xs text-red-600 mt-2">
							{actionError}
						</p>
					)}

					{/* ABOUT */}
					<div className="flex flex-col mt-3 pl-2">
						<h3 className="Poppins-SemiBold text-sm">About</h3>
						<p className="text-xs">
							{farm.apiary_type
								? `${farm.apiary_type} apiary run by ${farm.name}.`
								: "This beekeeper hasn't added a farm description yet."}
						</p>
					</div>

					{/* LOCATION */}
					<div className="flex flex-col mt-3 pl-2">
						<h3 className="Poppins-SemiBold text-sm">Location</h3>
						<p className="text-xs">
							{farm.location || "Not provided"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BeefarmView;
