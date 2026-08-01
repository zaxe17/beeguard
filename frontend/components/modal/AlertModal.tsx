"use client";
import { ModalContainer } from "./Modal";
import dynamic from "next/dynamic";
import { Button, CancelButton } from "../ui/Button";
import { Input, RangeInput, Select } from "../ui/Input";
import { useState } from "react";
import pesticides from "@/data/typesOfPesticide.json";

// Leaflet touches `window` at module-evaluation time, so it can't be
// server-rendered — load it client-side only. AddAlert stays mounted
// in the layout even when closed, so a static import would still
// break SSR for every /beekeeper/* route.
const Map = dynamic(() => import("../ui/google-maps/Map"), {
	ssr: false,
	loading: () => (
		<div className="w-full h-full flex items-center justify-center text-[#a6a3a3] text-sm">
			Loading map…
		</div>
	),
});

type AddAlertProps = {
	open: boolean;
	onClose: () => void;
	onConfirm?: () => void;
};
const OTHERS_VALUE = "others";
export const AddAlert = ({ open, onClose, onConfirm }: AddAlertProps) => {
	const [selectedPesticide, setSelectedPesticide] = useState("");
	const [otherPesticide, setOtherPesticide] = useState("");
	const pesticideOptions = [
		...pesticides.map((cs: { name: string; code: string }) => ({
			label: cs.name,
			value: cs.code,
		})),
		{ label: "Others", value: OTHERS_VALUE },
	];
	return (
		<ModalContainer
			open={open}
			width="w-1/3"
			header="Add New Hive"
			onClose={onClose}>
			{/* MAP */}
			<div className="w-full h-60 rounded-xl relative overflow-hidden">
				<Map />
			</div>
			<div className="flex flex-col gap-3">
				<h2 className="Poppins-SemiBold text-[#817b70]">
					Alert Information
				</h2>

				<RangeInput label="Danger Radius" min={1} max={5} unit="km" />

				{/* SELECT PESTICIDE TYPE */}
				<Select
					label="Select Pesticide"
					options={pesticideOptions}
					value={selectedPesticide}
					onSelectChange={(e) => setSelectedPesticide(e.target.value)}
				/>

				{/* IF SELECTED OTHERS SHOW INPUT */}
				{selectedPesticide === OTHERS_VALUE && (
					<Input
						placeholder="Enter pesticide name"
						value={otherPesticide}
						onChange={(e) => setOtherPesticide(e.target.value)}
					/>
				)}


				{/* PESTICIDE SCHEDULE DATE */}
				<Input label="Scheduled Date & Time" type="date" />

				{/* BUTTONS */}
				<div className="flex items-center gap-3 w-full">
					<CancelButton onClick={onClose} />
					<Button
						buttonType="button"
						label="Publish Alert"
						onClick={onConfirm}
					/>
				</div>
			</div>
		</ModalContainer>
	);
};