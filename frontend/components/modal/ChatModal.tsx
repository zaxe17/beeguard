"use client";

import React, { useState } from "react";
import { Button, CancelButton } from "../ui/Button";
import { Select } from "../ui/Input";
import { ModalContainer } from "./Modal";
import { useModal } from "@/context/ModalContext";

import reportChatCateg from "@/data/reportChatCateg.json";
import { api } from "@/services/api";

type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
};

type ModalType = "DeleteChat" | "ReportChat";
// Set by UserMessageCard's "..." menu / long-press sheet when it calls
// openModal("DeleteChat"|"ReportChat", { chatId }) — see MessagePopup.tsx.
type ChatModalPayload = { chatId: number };

// Both Delete and Report are mounted ONCE, globally, in
// app/citizen/layout.tsx as <Delete isOpen={...} onClose={...} /> with
// no other props — so which chat they act on comes from useModal()'s
// payload, not from props.

export const Delete = ({ isOpen, onClose }: ModalProps) => {
	const { payload } = useModal<ModalType, ChatModalPayload>();
	const [deleting, setDeleting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const handleDelete = async () => {
		if (!payload?.chatId) return;
		setDeleting(true);
		setErrorMsg(null);
		const res = await api.delete(`/chats/${payload.chatId}`);
		setDeleting(false);
		if (res.success) {
			// ChatPage listens for this to drop the deleted conversation
			// from its list immediately, instead of waiting for its next
			// poll — see ChatPage.tsx's "beeguard:chats-changed" listener.
			window.dispatchEvent(
				new CustomEvent("beeguard:chats-changed", {
					detail: { deletedChatId: payload.chatId },
				}),
			);
			onClose();
		} else {
			setErrorMsg(res.message || "Failed to delete conversation.");
		}
	};

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/3 w-full"
			header="Are you sure you want to delete this conversation?"
			onClose={onClose}>
			<p className="lg:text-sm text-xs text-center mb-5">
				Once deleted, this entire conversation and its messages will
				be permanently removed and you will no longer be able to view
				them. This action cannot be undone.
			</p>
			{errorMsg && (
				<p className="text-xs text-red-600 mb-3 text-center">{errorMsg}</p>
			)}
			<div className="flex gap-3">
				<CancelButton onClick={onClose} />
				<CancelButton
					BGcolor="bg-red-600"
					textColor="white"
					label={deleting ? "Deleting…" : "Delete"}
					onClick={handleDelete}
				/>
			</div>
		</ModalContainer>
	);
};

export const Report = ({ isOpen, onClose }: ModalProps) => {
	const { payload } = useModal<ModalType, ChatModalPayload>();
	const [category, setCategory] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const handleSubmit = async () => {
		if (!payload?.chatId) return;
		if (!category) {
			setErrorMsg("Please select a problem to report.");
			return;
		}
		setSubmitting(true);
		setErrorMsg(null);
		const res = await api.post("/chat-reports", {
			chat_id: payload.chatId,
			category,
		});
		setSubmitting(false);
		if (res.success) {
			setCategory("");
			onClose();
		} else {
			setErrorMsg(res.message || "Failed to submit report.");
		}
	};

	return (
		<ModalContainer
			open={isOpen}
			width="lg:w-1/3 w-full"
			header="Report"
			onClose={onClose}>
			{/*
			  NOTE: Select's exact onChange/value prop names weren't in the
			  files I was given — wire this to whatever Select actually
			  exposes (commonly `value` + `onChange={(v) => setCategory(v)}`
			  or `onValueChange`). Categories come from reportChatCateg.json;
			  the backend also exposes the same list at
			  GET /api/chat-reports/categories if you'd rather fetch it than
			  keep the local JSON in sync by hand.
			*/}
			<Select
				label="Select a problem to report"
				options={reportChatCateg}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setCategory(e.target.value)
				}
			/>
			{errorMsg && (
				<p className="text-xs text-red-600 mt-2 text-center">{errorMsg}</p>
			)}
			<div className="flex gap-3 mt-5">
				<CancelButton onClick={onClose} />
				<Button
					label={submitting ? "Submitting…" : "Submit"}
					onClick={handleSubmit}
				/>
			</div>
		</ModalContainer>
	);
};