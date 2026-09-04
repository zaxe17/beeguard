"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Logo = () => {
	const location = usePathname();
	const register = location.startsWith("/register");

	return (
		<div
			className={`lg:w-1/2 w-full relative flex flex-col justify-center items-center uppercase lg:border-none border-b border-b-[#b6771d] lg:pb-0 pb-5 ${register ? "lg:block hidden" : "block"}`}>
			<h1 className="Poppins-Bold lg:text-8xl text-5xl mb-4 lg:leading-none leading-4">
				beeguard
			</h1>
			<span className="Poppins-SemiBold lg:text-4xl text-2xl">
				save the bees
				<Link href="/citizen">citizen</Link>
				<Link href="/beekeeper">beekeeper</Link>
			</span>
		</div>
	);
};

export default Logo;
