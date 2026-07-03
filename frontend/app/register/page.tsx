import { ReactNode } from "react";
import Image, { StaticImageData } from "next/image";

import { FormContainer } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

interface ChoicesProps {
	icon: string | StaticImageData;
	role?: string;
	desc?: ReactNode;
}

// CHOSE ROLE
const Choices = ({ icon, role, desc }: ChoicesProps) => {
	return (
		<label
			className="w-120 flex justify-between items-center gap-5 bg-white/60 border-3 border-[#a6a3a3] rounded-xl p-5 group has-[input:checked]:border-[#ffcc53] has-[input:checked]:bg-[#f8f4e1]/60 transition-all cursor-pointer"
			style={{
				boxShadow:
					"rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px, rgba(0, 0, 0, 0.07) 0px 16px 32px, rgba(0, 0, 0, 0.07) 0px 32px 64px",
			}}>
			{/* RADIO */}
			<input type="radio" name="role" className="hidden" />

			{/* ICON */}
			<Image
				src={icon}
				alt="role"
				width={150}
				height={150}
				className="w-auto h-auto"
				priority
			/>

			{/* ROLE & DESC */}
			<div className="">
				<h2
					className="Poppins-Bold text-3xl">
					{role}
				</h2>
				<p className="text-[#a6a3a3] text-sm">{desc}</p>
			</div>

			{/* RADIO BUTTON */}
			<div className="w-7 h-7 rounded-full border-2 border-[#a6a3a3] flex items-center justify-center group-has-[input:checked]:border-[#ffc95f]">
				<div className="w-7 h-7 rounded-full bg-[#ffc95f] scale-0 group-has-[input:checked]:scale-100 transition-all flex justify-center items-center">
					<div className="radio-checked"></div>
				</div>
			</div>
		</label>
	);
};

const Register = () => {
	return (
		<FormContainer>
			<div className="text-center mb-12">
				<h1
					className="Poppins-Bold text-4xl">
					I am a
				</h1>
				<span className="text-[#a6a3a3] text-xl">
					Please select how you want to continue
				</span>
			</div>

			{/* CHOICES */}
			<div className="flex flex-col gap-6 mb-12">
				<Choices
					icon="/assets/citizen.png"
					role="Citizen"
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
					desc={
						<>
							A person who manages and cares for bee colonies,
							maintains hives, and harvests honey while promoting
							bee health and conservation.
						</>
					}
				/>
			</div>

			<Button buttonType="button" label="Next" route="/register/form" />
		</FormContainer>
	);
};

export default Register;
