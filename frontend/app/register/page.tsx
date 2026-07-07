"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import Image, { StaticImageData } from "next/image";

import { FormContainer } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

interface ChoicesProps {
	icon: string | StaticImageData;
	role?: string;
	desc?: ReactNode;
	value: "citizen" | "beekeeper";
	checked: boolean;
	onSelect: (v: "citizen" | "beekeeper") => void;
}

const Choices = ({
	icon,
	role,
	desc,
	value,
	checked,
	onSelect,
}: ChoicesProps) => {
	return (
		<label
			className="lg:w-120 w-full bg-white/60 border-3 border-[#a6a3a3] rounded-xl p-5 group has-[input:checked]:border-[#ffcc53] has-[input:checked]:bg-[#f8f4e1]/60 transition-all cursor-pointer"
			style={{
				boxShadow:
					"rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px, rgba(0, 0, 0, 0.07) 0px 16px 32px, rgba(0, 0, 0, 0.07) 0px 32px 64px",
			}}>
			<div className="flex justify-between items-center lg:gap-5 gap-2">
				<input
					type="radio"
					name="role"
					className="hidden"
					checked={checked}
					onChange={() => onSelect(value)}
				/>

				<div className="relative lg:w-37.5 lg:h-37.5 lg:block hidden">
					<Image
						src={icon}
						alt="role"
						fill
						className="object-contain"
						priority
					/>
				</div>

				<div>
					<div className="flex items-center gap-3">
						<h2 className="Poppins-Bold lg:text-3xl text-2xl">
							{role}
						</h2>
						<div className="relative lg:hidden block w-8 h-8">
							<Image
								src={icon}
								alt="role"
								fill
								className="object-contain"
								priority
							/>
						</div>
					</div>

					<p className="text-[#a6a3a3] lg:text-sm text-xs">{desc}</p>
				</div>

				<div className="w-7 h-7 rounded-full border-2 border-[#a6a3a3] flex items-center justify-center group-has-[input:checked]:border-[#ffc95f]">
					<div className="w-7 h-7 rounded-full bg-[#ffc95f] scale-0 group-has-[input:checked]:scale-100 transition-all flex justify-center items-center">
						<div className="radio-checked"></div>
					</div>
				</div>
			</div>
		</label>
	);
};

const Register = () => {
	const router = useRouter();
	const [role, setRole] = useState<"citizen" | "beekeeper">("citizen");

	const goNext = () => {
		if (typeof window !== "undefined") {
			sessionStorage.setItem("beeguard_role", role);
		}
		router.push("/register/form");
	};

	return (
		<FormContainer>
			<div className="text-center lg:mb-12 mb-8">
				<h1 className="Poppins-Bold lg:text-4xl text-2xl">I am a</h1>
				<span className="text-[#a6a3a3] text-base">
					Please select how you want to continue
				</span>
			</div>

			<div className="flex flex-col gap-6 lg:mb-12 mb-8">
				<Choices
					icon="/assets/citizen.png"
					role="Citizen"
					value="citizen"
					checked={role === "citizen"}
					onSelect={setRole}
					desc={
						<>
							A community member who helps protect bees by
							reporting sightings, supporting conservation, and
							connecting with local beekeepers.
						</>
					}
				/>

				<Choices
					icon="/assets/bee.png"
					role="Beekeeper"
					value="beekeeper"
					checked={role === "beekeeper"}
					onSelect={setRole}
					desc={
						<>
							A person who manages and cares for bee colonies,
							maintains hives, and harvests honey while promoting
							bee health and conservation.
						</>
					}
				/>
			</div>

			<Button buttonType="button" label="Next" onClick={goNext} />
		</FormContainer>
	);
};

export default Register;
