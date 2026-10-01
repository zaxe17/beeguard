"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import user_profile from "@/public/assets/user_profile.png";
import { useAuth } from "@/context/AuthContext";
import { mediaSrc } from "@/services/profile";

type ProfilePhotoProps = {
	src?: string | null;
	me?: boolean;
};

export const ProfilePhoto = ({ src, me = false }: ProfilePhotoProps) => {
	const { user } = useAuth();
	const path = me ? user?.profile_photo : src;
	const url = mediaSrc(path);

	const [failed, setFailed] = useState(false);

	// Reset kapag nagbago ang photo (hal. lumipat ng chat o nag-upload ng bago)
	useEffect(() => {
		setFailed(false);
	}, [url]);

	if (url && !failed) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={url}
				alt="user_profile"
				onError={() => setFailed(true)}
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
