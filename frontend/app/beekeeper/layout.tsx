"use client";

import { AddAlert } from "@/components/modal/AlertModal";
import {
	AddHiveModal,
	AddYield,
	MonitorHealth,
	QueenReplace,
	ViewHistory,
} from "@/components/modal/HivesModal";
import { Modal } from "@/components/modal/Modal";
import Sidebar from "@/components/Sidebar";
import { ModalProvider, useModal } from "@/context/ModalContext";

type ModalType =
	| "addHive"
	| "monitorHealth"
	| "addYield"
	| "generate"
	| "addAlert"
	| "viewHistory"
	| "replace";

const BeekeeperLayoutContent = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { closeModal, isModalOpen } = useModal<ModalType>();

	return (
		<div className="h-screen flex flex-row">
			<Sidebar />

			<main className="w-full flex flex-col">{children}</main>

			<Modal
				open={isModalOpen("generate")}
				onCancel={closeModal}
				onConfirm={closeModal}
				title="GENERATE YIELD HISTORY"
				content="Do you want to download your honey yield history?"
				labelButton="Download"
			/>

			<AddHiveModal
				isOpen={isModalOpen("addHive")}
				onClose={closeModal}
			/>

			<MonitorHealth
				isOpen={isModalOpen("monitorHealth")}
				onClose={closeModal}
			/>

			<AddYield isOpen={isModalOpen("addYield")} onClose={closeModal} />

			<AddAlert open={isModalOpen("addAlert")} onClose={closeModal} />

			<ViewHistory
				isOpen={isModalOpen("viewHistory")}
				onClose={closeModal}
			/>

			<QueenReplace
				isOpen={isModalOpen("replace")}
				onClose={closeModal}
			/>
		</div>
	);
};

const BeekeeperLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<ModalProvider>
			<BeekeeperLayoutContent>{children}</BeekeeperLayoutContent>
		</ModalProvider>
	);
};

export default BeekeeperLayout;