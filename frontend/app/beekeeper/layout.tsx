// layout.tsx

"use client";

import { useEffect, useState } from "react";
import { AddAlert } from "@/components/modal/AlertModal";
import {
	AddHiveModal,
	AddYield,
	MonitorHealth,
	QueenReplace,
	ViewHistory,
} from "@/components/modal/HivesModal";
import { GenerateReportModal } from "@/components/modal/ReportModal";
import Sidebar from "@/components/Sidebar";
import { ModalProvider, useModal } from "@/context/ModalContext";
import { hiveService, Hive } from "@/services/hive";
import { mapHealthStatusToUi } from "@/components/HiveContainer";
import {
	WarningQueenReplacment,
} from "@/components/popup/PopUp";
import { usePathname } from "next/navigation";

type ModalType =
	| "addHive"
	| "monitorHealth"
	| "addYield"
	| "generate"
	| "addAlert"
	| "viewHistory"
	| "replace";

type HivePayload = { hiveId: string };

const BeekeeperLayoutContent = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { closeModal, isModalOpen, payload } = useModal<ModalType, HivePayload>();

	const [targetHive, setTargetHive] = useState<Hive | null>(null);

	const pathname = usePathname();
	const location = pathname === "/beekeeper/hives";

	const hiveScoped =
		isModalOpen("monitorHealth") ||
		isModalOpen("addYield") ||
		isModalOpen("viewHistory") ||
		isModalOpen("replace");

	// Whenever a hive-scoped modal opens with a hiveId payload, fetch
	// that hive's full record so the modal can show real name/species/etc.
	useEffect(() => {
		if (!hiveScoped || !payload?.hiveId) {
			setTargetHive(null);
			return;
		}

		let cancelled = false;
		hiveService.getOne(payload.hiveId).then((res) => {
			if (!cancelled && res.success && res.data) setTargetHive(res.data);
		});
		return () => {
			cancelled = true;
		};
	}, [payload?.hiveId, hiveScoped]);

	return (
		<div className="w-full h-screen flex flex-row relative">
			<Sidebar />

			<main className="w-full flex flex-col relative">
				<div className="absolute top-0 z-[-2] h-full w-full bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,219,79,0.3),rgba(255,255,255,0))]"></div>
				{children}
			</main>

			{/* GENERATE REPORT — now previews the PDF in-modal before
			    the beekeeper commits to downloading it. */}
			<GenerateReportModal
				isOpen={isModalOpen("generate")}
				onClose={closeModal}
			/>

			<AddHiveModal
				isOpen={isModalOpen("addHive")}
				onClose={closeModal}
			/>

			<MonitorHealth
				isOpen={isModalOpen("monitorHealth")}
				onClose={closeModal}
				hive={
					targetHive
						? {
								hiveId: targetHive.hive_id,
								hiveName: targetHive.hive_name,
								beeSpecies: targetHive.bee_species,
								dateEstablished: targetHive.date_established,
							}
						: null
				}
			/>

			<AddYield
				isOpen={isModalOpen("addYield")}
				onClose={closeModal}
				hive={
					targetHive
						? {
								hiveId: targetHive.hive_id,
								hiveName: targetHive.hive_name,
								beeSpecies: targetHive.bee_species,
								dateEstablished: targetHive.date_established,
							}
						: null
				}
			/>

			<AddAlert open={isModalOpen("addAlert")} onClose={closeModal} />

			<ViewHistory
				isOpen={isModalOpen("viewHistory")}
				onClose={closeModal}
				hiveSummary={
					targetHive
						? {
								hiveId: targetHive.hive_id,
								hive: targetHive.hive_name,
								species: targetHive.bee_species,
								status: mapHealthStatusToUi(
									targetHive.health_status,
								),
								hiveState: targetHive.hive_state,
							}
						: undefined
				}
			/>

			<QueenReplace
				isOpen={isModalOpen("replace")}
				onClose={closeModal}
				hiveId={targetHive?.hive_id ?? null}
			/>

			<WarningQueenReplacment onClose={closeModal} />
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