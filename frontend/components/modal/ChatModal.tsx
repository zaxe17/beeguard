import { Button, CancelButton } from "../ui/Button";
import { Select } from "../ui/Input";
import { ModalContainer } from "./Modal";

import reportChatCateg from "@/data/reportChatCateg.json";

type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
};

export const Delete = ({ isOpen, onClose }: ModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/3 w-full"
			header="Are you sure you want to delete this message?"
			onClose={onClose}>
			<p className="lg:text-sm text-xs text-center mb-5">
				Once deleted, this message will be permanently removed from the
				conversation and you will no longer be able to view it. This
				action cannot be undone.
			</p>
			<div className="flex gap-3">
				<CancelButton onClick={onClose} />
				<CancelButton
					BGcolor="bg-red-600"
					textColor="white"
					label="Delete"
				/>
			</div>
		</ModalContainer>
	);
};

export const Report = ({ isOpen, onClose }: ModalProps) => {
	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/3 w-full"
			header="Report"
			onClose={onClose}>
			<Select
				label="Select a problem to report"
				options={reportChatCateg}
			/>
			<div className="flex gap-3 mt-5">
				<CancelButton onClick={onClose} />
				<Button label="Submit" />
			</div>
		</ModalContainer>
	);
};
