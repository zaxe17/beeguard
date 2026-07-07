"use client";

import { useState } from "react";
import { Button, CancelButton } from "../ui/Button";

type ModalProps = {
	title: string;
	content?: string;
	sub_content?: string;
	labelButton: string;
};

export const Modal = ({ title, content, sub_content, labelButton }: ModalProps) => {
	const [open, setOpen] = useState(true);

	if (!open) return null;

	return (
		<div className="hidden">
			<div className="fixed w-full h-full bg-black/50 z-50 flex justify-center items-center">
				{/* CONTAINER */}
				<div className="w-1/3 bg-[#fefefd] rounded-3xl border-2 border-[#a6a3a3] border-solid p-5">
					{/* CONTENTS */}
					<div className="flex flex-col items-center text-center gap-5">
						{/* TITLE */}
						<h2 className="Poppins-Bold text-[#ffce1c] text-2xl">
							{title}
						</h2>

						{/* CONTENT */}
						{content && (
							<p className="text-[#a6a3a3] text-sm">{content}</p>
						)}

						{/* SUB-CONTENT */}
						{sub_content && (
							<p className="text-base font-black">
								{sub_content}
							</p>
						)}

						{/* BUTTONS */}
						<div className="flex items-center gap-3 w-full">
							<CancelButton onClick={() => setOpen(false)} />
							<Button
								buttonType="button"
								label={labelButton}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
