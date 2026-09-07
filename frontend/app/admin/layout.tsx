"use client";

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

type HivePayload = { hiveId: string };

const AdminLayoutContent = ({ children }: { children: React.ReactNode }) => {
	const { closeModal, isModalOpen, payload } = useModal<
		ModalType,
		HivePayload
	>();

	const hiveScoped =
		isModalOpen("monitorHealth") ||
		isModalOpen("addYield") ||
		isModalOpen("viewHistory") ||
		isModalOpen("replace");

	return (
		<div className="w-full h-screen flex lg:flex-row flex-col-reverse relative overflow-hidden">
			<Sidebar />

			<main className="w-full flex flex-col relative h-full overflow-y-auto pb-13 lg:pb-0">
				<div className="absolute top-0 z-[-2] h-full w-full bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,219,79,0.3),rgba(255,255,255,0))]"></div>
				{children}
			</main>

			{/* PUT MODAL HERE FOR ADMIN */}
		</div>
	);
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<ModalProvider>
			<AdminLayoutContent>{children}</AdminLayoutContent>
		</ModalProvider>
	);
};

export default AdminLayout;
