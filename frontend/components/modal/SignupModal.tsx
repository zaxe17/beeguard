import { Icon } from "@iconify/react";
import { ModalContainer } from "./Modal";
import { Button, CancelButton } from "../ui/Button";

type SignupProps = {
	isOpen: boolean;
	onClose: () => void;
};

export const SignupModal = ({ isOpen, onClose }: SignupProps) => {
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
					<Button label="Sign up" />
				</div>
			</div>
		</ModalContainer>
	);
};
