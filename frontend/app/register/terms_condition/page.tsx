import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { CheckBox } from "@/components/ui/Input";

type termCond = {
	title?: string;
	content?: string[];
	list?: boolean;
};

const termCondContent = [
	{
		title: "1. Purpose",
		content: [
			"BeeConnect is a platform that brings together\n beekeepers and citizens to promote bee health, share\n knowledge, and build a more sustainable\n environment.",
		],
		listStyle: false,
	},
	{
		title: "2. For Beekeepers",
		content: [
			"You agree to provide accurate information about\n your hives.",
			"You are responsible for the health and safety of\n your bees.",
			"You agree to follow best practices and local\n regulations.",
		],
		listStyle: true,
	},
	{
		title: "3. For Citizen",
		content: [
			"You agree to use the platform to learn, engage,\n and support bee conservation.",
			"You may report bee sightings or environmental\n concerns honestly.",
			"You agree to respect beekeepers and their work.",
		],
		listStyle: true,
	},
	{
		title: "4. General",
		content: [
			"We reserve the right to update these terms. Continued\n use of the platform means you accept the updated\n terms.",
		],
		listStyle: false,
	},
];

const TermsCondition = () => {
	return (
		<FormContainer>
			{/* HEADER */}
			<div className="text-center mb-7">
				<h1
					className="Poppins-Bold text-[28px] text-[#ff9a00]">
					Terms & Conditions
				</h1>
			</div>

			{/* CONTENT */}
			<div className="flex h-100">
				<ul className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1">
					{termCondContent.map((tc, i) => (
						<div className="mb-3" key={i}>
							<li
								className="Poppins-Bold text-[#ffce1c] text-sm">
								{tc.title}
							</li>
							{tc.content.map((cont, ind) => (
								<li
									key={ind}
									className={`${tc.listStyle ? "list-disc ml-4" : ""} text-xs whitespace-pre-line`}>
									{cont}
								</li>
							))}
						</div>
					))}
				</ul>
			</div>

			<div className="mt-5 flex flex-col gap-3">
				<CheckBox
					label={
						<div className="text-xs">
							I have read and agree to the{" "}
							<span
								className="Poppins-Bold text-[#ff9a00]">
								Terms & Conditions.
							</span>
						</div>
					}
				/>

				<Button
					buttonType="button"
					label="Next"
					route="/register/terms_condition"
				/>
			</div>
		</FormContainer>
	);
};

export default TermsCondition;
