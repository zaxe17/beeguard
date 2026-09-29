// components/modal/SignupModal.tsx
"use client";

import { useRouter } from "next/navigation";
import { ModalContainer } from "./Modal";
import { Button } from "../ui/Button";

type SignupProps = {
	isOpen: boolean;
	onClose: () => void;
};

// Guest page (/guest): shown after the guest presses "Submit Photo" on
// the bee result. Submitting a report needs an account, so:
//   Log In  -> login page ("/")
//   Sign Up -> registration ("/register")
// The X closes it and keeps the guest on the result.
export const SignupModal = ({ isOpen, onClose }: SignupProps) => {
	const router = useRouter();

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/4 w-full"
			header="Log In to Submit"
			onClose={onClose}>
			<div className="flex flex-col justify-center items-center">
				<span className="Poppins-SemiBold text-[#817b70] text-sm text-center">
					You need to log in to submit your bee photo and report the
					swarm. No account yet? Sign up — it only takes a minute.
				</span>

				<div className="w-full flex gap-3 mt-10">
					<Button
						buttonType="button"
						label="Log In"
						bgNone
						onClick={() => router.push("/")}
					/>
					<Button
						buttonType="button"
						label="Sign Up"
						onClick={() => router.push("/register")}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};