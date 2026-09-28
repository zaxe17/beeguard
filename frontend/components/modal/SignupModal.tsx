// components/modal/SignupModal.tsx
"use client";

import { useRouter } from "next/navigation";
import { ModalContainer } from "./Modal";
import { Button, CancelButton } from "../ui/Button";

type SignupProps = {
	isOpen: boolean;
	onClose: () => void;
};

// Shown on the guest page (/guest) after a photo is taken/uploaded.
// "Sign up" -> registration; "Cancel" just closes it so the guest can
// still see the identification result.
export const SignupModal = ({ isOpen, onClose }: SignupProps) => {
	const router = useRouter();

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/4 w-full"
			header="Create an Account to Submit"
			onClose={onClose}>
			<div className="flex flex-col justify-center items-center">
				<span className="Poppins-SemiBold text-[#817b70] text-sm text-center">
					Create an account to submit your identified bee photo.
				</span>

				<div className="w-full flex gap-3 mt-10">
					<CancelButton onClick={onClose} />
					<Button
						buttonType="button"
						label="Sign up"
						onClick={() => router.push("/register")}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};