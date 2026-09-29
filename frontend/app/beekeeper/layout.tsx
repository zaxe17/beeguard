// app/beekeeper/layout.tsx
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { AddAlert, ALERTS_CHANGED_EVENT } from "@/components/modal/AlertModal";
import {
	AddHiveModal,
	AddYield,
	HIVES_CHANGED_EVENT,
	MonitorHealth,
	QueenReplace,
	ViewHistory,
} from "@/components/modal/HivesModal";
import { BeeReport, GenerateReportModal } from "@/components/modal/ReportModal";
import Sidebar from "@/components/Sidebar";
import { ModalProvider, useModal } from "@/context/ModalContext";
import { hiveService, Hive } from "@/services/hive";
import { mapHealthStatusToUi } from "@/components/HiveContainer";
import { WarningQueenReplacment } from "@/components/popup/PopUp";
import { Delete, Report } from "@/components/modal/ChatModal";
// OFFLINE MODE
import { OfflineBanner } from "@/components/OfflineBanner";
import { OFFLINE_SYNCED_EVENT } from "@/lib/offlineStatus";
import { BEEKEEPER_REPORTS_CHANGED_EVENT } from "@/services/beekeeperReport";
import BeeGuardLayout from "@/components/BeeGuardLayout";

// Beekeeper pages saved on the phone so they still open offline.
const OFFLINE_PAGES = [
	"/beekeeper",
	"/beekeeper/hives",
	"/beekeeper/alert",
	"/beekeeper/alert/today",
	"/beekeeper/report",
	"/beekeeper/history",
	"/beekeeper/profile",
];

// Tell every page to load fresh data (same events the modals already use).
const reloadAllPages = () => {
	window.dispatchEvent(new Event(HIVES_CHANGED_EVENT));
	window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
	window.dispatchEvent(new Event(BEEKEEPER_REPORTS_CHANGED_EVENT));
};

// "ReportOffer" removed — that modal is now nested locally inside
// BeeReportContent (in ReportModal.tsx), not controlled globally.
type ModalType =
	| "addHive"
	| "monitorHealth"
	| "addYield"
	| "generate"
	| "addAlert"
	| "viewHistory"
	| "replace"
	| "BeeReport"
	| "DeleteChat"
	| "ReportChat";

type HivePayload = { hiveId: string };

// PUT MODAL IN THIS FUNCTION
const MyModal = () => {
	const { closeModal, isModalOpen, payload } = useModal<
		ModalType,
		HivePayload
	>();

	const [targetHive, setTargetHive] = useState<Hive | null>(null);

	// OFFLINE MODE — offline changes just reached the server: reload pages.
	useEffect(() => {
		window.addEventListener(OFFLINE_SYNCED_EVENT, reloadAllPages);
		return () =>
			window.removeEventListener(OFFLINE_SYNCED_EVENT, reloadAllPages);
	}, []);

	const hiveScoped =
		isModalOpen("monitorHealth") ||
		isModalOpen("addYield") ||
		isModalOpen("viewHistory") ||
		isModalOpen("replace");

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
		<>
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

			{/* iisang <BeeReport /> na lang — duplicate ang tinanggal */}
			<BeeReport isOpen={isModalOpen("BeeReport")} onClose={closeModal} />

			<Delete isOpen={isModalOpen("DeleteChat")} onClose={closeModal} />

			<Report isOpen={isModalOpen("ReportChat")} onClose={closeModal} />
		</>
	);
};

const BeekeeperLayout = ({ children }: { children: React.ReactNode }) => {
	const handleBackOnline = useCallback(() => reloadAllPages(), []);

	return (
		<ModalProvider>
			<Suspense fallback={null}>
				<BeeGuardLayout
					// OFFLINE MODE — offline notice + changes waiting to sync
					offlineBanner={
						<OfflineBanner
							onBackOnline={handleBackOnline}
							warmRoutes={OFFLINE_PAGES}
						/>
					}
					// CHILDREN CONTENT
					content={children}
					// MODALS
					modal={<MyModal />}
				/>
			</Suspense>
		</ModalProvider>
	);
};

export default BeekeeperLayout;
