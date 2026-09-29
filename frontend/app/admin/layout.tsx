"use client";

import { Suspense } from "react";
import { ModalProvider, useModal } from "@/context/ModalContext";
import { Delete, Report } from "@/components/modal/ChatModal";
import AddAlert from "@/components/modal/AlertModal";
import BeeGuardLayout from "@/components/BeeGuardLayout";

type ModalType =
	| "addHive"
	| "monitorHealth"
	| "addYield"
	| "generate"
	| "addAlert"
	| "viewHistory"
	| "replace"
	| "DeleteChat"
	| "ReportChat";

type HivePayload = { hiveId: string };

// PUT MODAL HERE IN THIS FUCNTION
const MyModal = () => {
	const { closeModal, isModalOpen } = useModal<ModalType, HivePayload>();

	return (
		<>
			{/* PUT MODAL HERE FOR ADMIN */}
			<Delete isOpen={isModalOpen("DeleteChat")} onClose={closeModal} />

			<Report isOpen={isModalOpen("ReportChat")} onClose={closeModal} />

			<AddAlert open={isModalOpen("addAlert")} onClose={closeModal} />
		</>
	);
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<ModalProvider>
			<Suspense fallback={null}>
				<BeeGuardLayout content={children} modal={<MyModal />} />
			</Suspense>
		</ModalProvider>
	);
};

export default AdminLayout;
