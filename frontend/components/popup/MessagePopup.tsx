"use client";

import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import React, { useRef, useState } from "react";

type MenuTabProps = {
	icon: string;
	label: string;
	onClick?: (e: React.MouseEvent) => void;
	danger?: boolean;
};

const TabMenu = [
	{ icon: "fluent:mail-unread-16-regular", label: "Mark as unread" },
	{ icon: "fluent:archive-16-regular", label: "Archive" },
	{ icon: "fluent:delete-12-regular", label: "Delete", danger: true },
	{ icon: "tabler:message-report", label: "Report" },
];

const AddTabMenu = [
	{ icon: "bx:image-add", label: "Image" },
	{ icon: "fluent:archive-16-regular", label: "Location" },
];

type MessagePopupMenuProps = {
	top?: number;
	left?: number;
	onAction?: (label: string) => void;
};

type MessagePopupContainerProps = {
	top?: number;
	left?: number;
	translateX?: string;
	children?: React.ReactNode;
};

const MenuTab = ({ icon, label, onClick, danger }: MenuTabProps) => {
	return (
		<div
			onClick={onClick}
			className={`flex items-center gap-2 w-full py-1 px-1 cursor-pointer transition-all duration-105 ease-in-out hover:bg-[#fff4c7] rounded-sm ${danger ? "text-red-600" : "text-[#4a2f00]"}`}>
			<div className="w-4 h-4">
				<Icon icon={icon} className="w-4 h-4" />
			</div>
			<label className="text-sm font-medium cursor-pointer">
				{label}
			</label>
		</div>
	);
};

const MessagePopupContainer = ({
	top,
	left,
	translateX,
	children,
}: MessagePopupContainerProps) => {
	return (
		<div
			style={{ top, left }}
			className={`fixed z-1000 w-50 ${translateX} bg-[#fffdf5] shadow-[0px_1px_2px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.07),0px_4px_8px_rgba(0,0,0,0.07),0px_8px_16px_rgba(0,0,0,0.07),0px_16px_32px_rgba(0,0,0,0.07),0px_32px_64px_rgba(0,0,0,0.07)] rounded-lg py-2 px-1`}>
			{children}
		</div>
	);
};

export const MessagePopupMenu = ({
	top,
	left,
	onAction,
}: MessagePopupMenuProps) => {
	return (
		<MessagePopupContainer
			left={left}
			top={top}
			translateX="-translate-x-1/2">
			{TabMenu.map((tabCon, i) => (
				<MenuTab
					key={i}
					icon={tabCon.icon}
					label={tabCon.label}
					danger={tabCon.danger}
					onClick={(e) => {
						e.stopPropagation();
						onAction?.(tabCon.label);
					}}
				/>
			))}
		</MessagePopupContainer>
	);
};

// MOBILE — long-press bottom sheet
type MessageBottomSheetProps = {
	onClose: () => void;
	onAction?: (label: string) => void;
};

export const MessageBottomSheet = ({
	onClose,
	onAction,
}: MessageBottomSheetProps) => {
	return (
		<div className="fixed inset-0 z-1000 flex items-end pb-10">
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
				className="absolute inset-0 bg-black/40"
				onClick={(e) => {
					e.stopPropagation();
					onClose();
				}}
			/>

			<motion.div
				initial={{ y: "100%" }}
				animate={{ y: 0 }}
				exit={{ y: "100%" }}
				transition={{ type: "spring", damping: 28, stiffness: 320 }}
				className="relative w-full bg-[#fffdf5] rounded-t-2xl pt-2 pb-6 px-3"
				onClick={(e) => e.stopPropagation()}>
				<div className="w-10 h-1.5 bg-[#e2e2e6] rounded-full mx-auto mb-3" />

				{TabMenu.map((tabCon, i) => (
					<div
						key={i}
						onClick={(e) => {
							e.stopPropagation();
							onAction?.(tabCon.label);
						}}
						className={`flex items-center gap-3 w-full py-3 px-2 rounded-lg active:bg-[#fff4c7] ${tabCon.danger ? "text-red-600" : "text-[#4a2f00]"}`}>
						<Icon icon={tabCon.icon} className="w-5 h-5" />
						<span className="text-sm font-medium">
							{tabCon.label}
						</span>
					</div>
				))}
			</motion.div>
		</div>
	);
};

// CHAT ADD BUTTON MENU OPTION
export const ChatOptionMenu = () => {
	const [menuPos, setMenuPos] = useState<{
		top: number;
	} | null>(null);
	const buttonRef = useRef<HTMLDivElement>(null);

	const toggleMenu = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (menuPos) {
			setMenuPos(null);
			return;
		}
		const rect = buttonRef.current?.getBoundingClientRect();
		if (!rect) return;
		setMenuPos({
			top: rect.top - 8,
		});
	};

	return (
		<div className="relative" ref={buttonRef}>
			<div onClick={toggleMenu} className="w-8 h-8 cursor-pointer">
				<Icon
					icon="basil:add-solid"
					className="w-8 h-8 text-[#ffdb4f]"
				/>
			</div>

			{menuPos && (
				<>
					<div
						className="fixed inset-0 z-999"
						onClick={(e) => {
							e.stopPropagation();
							setMenuPos(null);
						}}
					/>
					<MessagePopupContainer
						top={menuPos.top}
						translateX="-translate-y-full">
						{AddTabMenu.map((tabCon, i) => (
							<MenuTab
								key={i}
								icon={tabCon.icon}
								label={tabCon.label}
								onClick={(e) => {
									e.stopPropagation();
									console.log("Chat action:", tabCon.label);
									setMenuPos(null);
								}}
							/>
						))}
					</MessagePopupContainer>
				</>
			)}
		</div>
	);
};
