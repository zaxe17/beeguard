// page.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import {
	HiveDetailsContainer,
	HiveTabs,
	mapHealthStatusToUi,
} from "@/components/HiveContainer";
import { SearchBar } from "@/components/ui/Input";
import { Icon } from "@iconify/react";
import { useModal } from "@/context/ModalContext";
import { hiveService, Hive } from "@/services/hive";
import { HIVES_CHANGED_EVENT, BeeQueenModal } from "@/components/modal/HivesModal";
import { analyticsService } from "@/services/analytics";

type ModalType =
	| "addHive"
	| "monitorHealth"
	| "addYield"
	| "generate"
	| "viewHistory"
	| "replace";

type HivePayload = { hiveId: string };

// Health statuses that should trigger the queen-alert popup
// the moment the hive is tapped in the list.
const QUEEN_ALERT_STATUSES = new Set([
	"Needs Attention",
	"Weak",
	"Diseased",
]);

function formatKg(v: number | undefined | null) {
	return v == null ? "—" : `${v.toFixed(1)}kg`;
}

const Hives = () => {
	const { openModal } = useModal<ModalType, HivePayload>();

	const [hives, setHives] = useState<Hive[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [thisMonthKg, setThisMonthKg] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	// Queen-alert popup state — separate from `selectedId` so it can
	// be dismissed without losing the current selection.
	const [queenAlertHive, setQueenAlertHive] = useState<Hive | null>(null);
	const [showQueenAlert, setShowQueenAlert] = useState(false);

	const loadAll = useCallback(async () => {
		setLoading(true);
		const [hivesRes, monthlyRes] = await Promise.all([
			hiveService.list(),
			analyticsService.hiveMonthlyYield?.() ??
				Promise.resolve({ success: false, message: "", data: undefined }),
		]);

		if (hivesRes.success && hivesRes.data) {
			setHives(hivesRes.data);
			setSelectedId((prev) =>
				prev && hivesRes.data!.some((h: Hive) => h.hive_id === prev)
					? prev
					: (hivesRes.data![0]?.hive_id ?? null),
			);
		}

		if (monthlyRes.success && monthlyRes.data) {
			setThisMonthKg(monthlyRes.data as Record<string, number>);
		}

		setLoading(false);
	}, []);

	useEffect(() => {
		loadAll();
	}, [loadAll]);

	// NEW: whenever a hive is added/updated anywhere (modals dispatch
	// this event on success), refetch immediately — no restart needed.
	useEffect(() => {
		const handler = () => loadAll();
		window.addEventListener(HIVES_CHANGED_EVENT, handler);
		return () => window.removeEventListener(HIVES_CHANGED_EVENT, handler);
	}, [loadAll]);

	const selectedHive = hives.find((h) => h.hive_id === selectedId) ?? null;

	const filteredHives = hives.filter((h) =>
		h.hive_name.toLowerCase().includes(search.trim().toLowerCase()),
	);

	const openHiveModal = (modal: "monitorHealth" | "addYield" | "viewHistory" | "replace") => {
		if (!selectedHive) return;
		openModal(modal, { hiveId: selectedHive.hive_id });
	};

	// Handles a tap on a hive tab in the list: selects it, and if its
	// health status needs attention, pops up the queen-alert modal.
	const handleSelectHive = (hive: Hive) => {
		setSelectedId(hive.hive_id);
		if (QUEEN_ALERT_STATUSES.has(hive.health_status)) {
			setQueenAlertHive(hive);
			setShowQueenAlert(true);
		}
	};

	return (
		<div className="w-full h-full flex items-start">
			{/* CONTAINER FOR HIVE LIST */}
			<Container width="40%" height="100%" borderNone>
				<div className="w-full pt-5 px-2 flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<h3 className="Poppins-SemiBold text-3xl text-[#020101]">
							Hives
						</h3>

						<div className="flex items-center gap-3">
							{/* GENERATE */}
							<div
								onClick={() => openModal("generate")}
								className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center">
								<Icon
									icon="mdi:file-cog"
									className="w-8 h-8 text-[#ffdb4f]"
								/>
							</div>

							{/* ADD BUTTON */}
							<div
								onClick={() => openModal("addHive")}
								className="w-8 h-8 bg-[#ffdb4f] rounded-full cursor-pointer flex items-center justify-center">
								<Icon
									icon="tdesign:add"
									className="w-full h-full text-white"
								/>
							</div>
						</div>
					</div>

					<SearchBar
						placeholder="Search My Hives"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				{/* SCROLLABLE HIVE LIST */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0">
					{loading ? (
						<p className="text-center text-sm text-[#817b70] p-4">
							Loading hives...
						</p>
					) : filteredHives.length === 0 ? (
						<div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40 p-8">
							<Icon
								icon="ic:round-hive"
								className="w-16 h-16 text-[#a6a3a3]"
							/>
							<h2 className="Poppins-SemiBold text-[#817b70]">
								{hives.length === 0
									? "No hives yet — add your first one."
									: "No hives match your search."}
							</h2>
						</div>
					) : (
						filteredHives.map((h) => (
							<HiveTabs
								key={h.hive_id}
								hiveId={h.hive_id}
								hive={h.hive_name}
								location={h.bee_species}
								lastCheck={h.date_established}
								status={mapHealthStatusToUi(h.health_status)}
								yieldThisMonth={formatKg(thisMonthKg[h.hive_id])}
								hiveState={h.hive_state}
								selected={h.hive_id === selectedId}
								onClick={() => handleSelectHive(h)}
							/>
						))
					)}
				</div>
			</Container>

			<div className="flex-1 h-full">
				<div className="flex flex-col gap-10 items-center justify-center h-full">
					<h1 className="Poppins-Bold text-5xl">Hive Details</h1>

					{selectedHive ? (
						<HiveDetailsContainer
							hiveHealthButton={() => openHiveModal("monitorHealth")}
							addYieldButton={() => openHiveModal("addYield")}
							history={() => openHiveModal("viewHistory")}
							replacement={() => openHiveModal("replace")}
							hiveId={selectedHive.hive_id}
							hive={selectedHive.hive_name}
							location={selectedHive.bee_species}
							lastCheck={selectedHive.date_established}
							hiveState={selectedHive.hive_state}
							status={mapHealthStatusToUi(selectedHive.health_status)}
							yieldThisMonth={formatKg(thisMonthKg[selectedHive.hive_id])}
						/>
					) : (
						<p className="text-[#a6a3a3]">
							{loading ? "Loading..." : "Select a hive to see its details."}
						</p>
					)}
				</div>
			</div>

			{/* QUEEN ALERT POPUP — shows when a tapped hive needs attention */}
			<BeeQueenModal
				isOpen={showQueenAlert}
				onClose={() => setShowQueenAlert(false)}
				hive={
					queenAlertHive
						? {
								hiveId: queenAlertHive.hive_id,
								hiveName: queenAlertHive.hive_name,
								healthStatus: queenAlertHive.health_status,
							}
						: null
				}
				onReplaceQueen={() => {
					setShowQueenAlert(false);
					if (queenAlertHive) {
						openModal("replace", { hiveId: queenAlertHive.hive_id });
					}
				}}
			/>
		</div>
	);
};

export default Hives;