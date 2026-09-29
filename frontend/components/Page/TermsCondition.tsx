import { Icon } from "@iconify/react";
import { Button } from "../ui/Button";
import { FormContainer } from "../ui/Container";
import { CheckBox } from "../ui/Input";

import termCondContent from "@/data/termsCondition.json";
import { useRouter } from "next/navigation";

type TermsConditionPageProps = {
	mode?: "register" | "view";
	accepted?: boolean;
	onAcceptedChange?: (checked: boolean) => void;
	errorMsg?: string | null;
	submitting?: boolean;
	onSubmit?: () => void;
};

export const TermsConditionPage = ({
	mode = "view",
	accepted,
	onAcceptedChange,
	errorMsg,
	submitting,
	onSubmit,
}: TermsConditionPageProps) => {
	const router = useRouter();

	return (
		<FormContainer>
			<div className="text-center lg:mb-7 mb-15">
				<h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
					Terms & Conditions
				</h1>
			</div>

			<div className="flex h-100">
				<ul className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1">
					{termCondContent.map((tc, i) => (
						<div className="mb-3" key={i}>
							<li className="Poppins-Bold text-[#ffce1c] text-sm">
								{tc.title}
							</li>
							{tc.content.map((cont, ind) => (
								<li
									key={ind}
									className={`${
										tc.listStyle ? "list-disc ml-4" : ""
									} text-xs whitespace-pre-line`}>
									{cont}
								</li>
							))}
						</div>
					))}
				</ul>
			</div>

			{mode === "register" && (
				<div className="mt-5 flex flex-col gap-3">
					<CheckBox
						checked={accepted}
						onCheckedChange={onAcceptedChange}
						label={
							<div className="text-xs">
								I have read and agree to the{" "}
								<span className="Poppins-Bold text-[#ff9a00]">
									Terms & Conditions.
								</span>
							</div>
						}
					/>

					{errorMsg && (
						<p className="text-xs text-red-600">{errorMsg}</p>
					)}

					<div className="flex flex-col justify-center items-center gap-4">
						<Button
							buttonType="button"
							label={
								submitting ? "Submitting..." : "Create Account"
							}
							onClick={onSubmit}
							disabled={submitting || !accepted}
						/>

						<button
							onClick={() => router.back()}
							className="flex items-center gap-2 cursor-pointer">
							<Icon
								icon="bx:arrow-back"
								className="text-2xl text-[#ffa004]"
							/>
							Go back
						</button>
					</div>
				</div>
			)}
		</FormContainer>
	);
};

export const PrivacyPolicyPage = () => {
	return (
		<FormContainer>
			<div className="text-center lg:mb-7 mb-15">
				<h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
					Privacy Policy
				</h1>
			</div>
		</FormContainer>
	);
};
