"use client";

import { Container } from "@/components/ui/Container";
import {
	HiveDetailsContainer,
	HiveTabs,
	HiveProps,
} from "@/components/HiveContainer";
import { SearchBar } from "@/components/ui/Input";
import { Icon } from "@iconify/react";
import { useModal } from "@/context/ModalContext";

import hivesData from "@/data/hive.json";
const hive = hivesData as HiveProps[];

type ModalType =
	| "addHive"
	| "monitorHealth"
	| "addYield"
	| "generate"
	| "viewHistory"
	| "replace";

const Hives = () => {
	const { openModal } = useModal<ModalType>();

	return (
		<div className="w-full h-full flex items-start">
			{/* CONTAINER FOR BEEFARM LOCATION TAB */}
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

					<SearchBar placeholder="Search My Hives" />
				</div>

				{/* SCROLLABLE HIVE CARD */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0">
					{hive.map((h, i) => (
						<HiveTabs
							key={i}
							hiveId={h.hiveId}
							hive={h.hive}
							location={h.location}
							lastCheck={h.lastCheck}
							status={h.status}
							yieldThisMonth={h.yieldThisMonth}
							hiveState={h.hiveState}
						/>
					))}
				</div>
			</Container>

			<div className="flex-1 h-full">
				<div className="flex flex-col gap-10 items-center justify-center h-full">
					<h1 className="Poppins-Bold text-5xl">Hive Details</h1>

					{/* CONTAINER */}
					<HiveDetailsContainer
						hiveHealthButton={() => openModal("monitorHealth")}
						addYieldButton={() => openModal("addYield")}
						history={() => openModal("viewHistory")}
						replacement={() => openModal("replace")}
						hiveId="Hive #001"
						hive="duolingo"
						location="Baguio City"
						lastCheck="May 15, 2026"
						hiveState="Active"
						status="healthy"
					/>
				</div>
			</div>
		</div>
	);
};

export default Hives;
