"use client";

import Image from "next/image";

import user_profile from "@/public/assets/user_profile.png";
import { useAuth } from "@/context/AuthContext";
import { mediaSrc } from "@/services/profile";

type ProfilePhotoProps = {
	// Someone's photo path from the API ("/uploads/profile/...").
	// null / undefined -> the default picture.
	src?: string | null;
	// true = the logged-in user's OWN photo (top bar, sidebar, profile page).
	me?: boolean;
};

// Round-cropped by whatever wraps it (most wrappers use rounded-full).
// Uploaded photos come from the Flask server, so a plain <img> is used
// for them (no next.config image domains needed).
export const ProfilePhoto = ({ src, me = false }: ProfilePhotoProps) => {
	const { user } = useAuth();
	const path = me ? user?.profile_photo : src;
	const url = mediaSrc(path);

	if (url) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={url}
				alt="user_profile"
				className="w-full h-full object-cover rounded-full"
			/>
		);
	}

	return (
		<Image
			src={user_profile}
			alt="user_profile"
			className="w-full h-full object-cover"
		/>
	);
};

export const Name = () => {
	return <div>Name</div>;
};