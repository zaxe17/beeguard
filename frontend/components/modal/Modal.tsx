"use client";

import { useEffect } from "react";
import { Icon } from "@iconify/react";
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

interface ModalContainerProps {
	children: React.ReactNode;
	open: boolean;
	width?: string;
	height?: string;
	header?: string;
	onClose: () => void;
}

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

export const ModalContainer = ({
	children,
	open,
	width,
	height,
	header,
	onClose,
}: ModalContainerProps) => {
	useEffect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	if (!open) return null;

	return (
		<div
			className="fixed w-full h-full bg-black/50 z-50 flex justify-center items-center capitalize p-5"
			onClick={onClose}>
			{/* CONTAINER */}
			<div
				className={`${width} ${height} bg-[#fefefd] rounded-3xl border-2 border-[#a6a3a3] border-solid p-5 flex flex-col`}
				onClick={(e) => e.stopPropagation()}>
				<div className="w-full flex-1 flex flex-col gap-5 min-h-0">
					{/* HEADER */}
					<div className="relative w-full text-center flex items-center justify-center shrink-0">
						<div
							onClick={onClose}
							className="absolute -right-3.5 -top-3.5 w-7 h-7 cursor-pointer">
							<Icon
								icon="iconamoon:close-circle-2-duotone"
								className="w-full h-full text-[#4A2F00]"
							/>
						</div>
						<h1 className="Poppins-Bold relative text-2xl text-[#4A2F00]">
							{header}
						</h1>
					</div>

					{children}
				</div>
			</div>
		</div>
	);
};