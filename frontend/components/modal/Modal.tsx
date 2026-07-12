"use client";

import { useEffect } from "react";
import { Button, CancelButton } from "../ui/Button";

type ModalProps = {
	open: boolean;
	title: string;
	content?: string;
	sub_content?: string;
	labelButton: string;
	loading?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
};

export const Modal = ({
	open,
	title,
	content,
	sub_content,
	labelButton,
	loading = false,
	onCancel,
	onConfirm,
}: ModalProps) => {
	useEffect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	if (!open) return null;

	const handleBackdrop = () => {
		if (!loading) onCancel();
	};

	return (
		<div
			className="fixed inset-0 w-full h-full bg-black/50 z-50 flex justify-center items-center"
			onClick={handleBackdrop}>
			<div
				className="w-1/3 min-w-[320px] bg-[#fefefd] rounded-3xl border-2 border-[#a6a3a3] border-solid p-5"
				onClick={(e) => e.stopPropagation()}>
				<div className="flex flex-col items-center text-center gap-5">
					<h2 className="Poppins-Bold text-[#ffce1c] text-2xl">
						{title}
					</h2>

					{content && (
						<p className="text-[#a6a3a3] text-sm">{content}</p>
					)}

					{sub_content && (
						<p className="text-base font-black">{sub_content}</p>
					)}

					<div className="flex items-center gap-3 w-full">
						<CancelButton
							onClick={onCancel}
							disabled={loading}
						/>
						<Button
							buttonType="button"
							label={loading ? "Processing..." : labelButton}
							onClick={onConfirm}
							disabled={loading}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
