import Image from "next/image";

import user_profile from "@/public/assets/user_profile.png";

export const ProfilePhoto = () => {
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
