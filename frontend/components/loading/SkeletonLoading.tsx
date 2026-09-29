// BEEFARM CONTAINER
export const BeefarmSkeleton = () => {
	return (
		<div className="p-1.5 flex flex-col rounded-2xl" aria-hidden="true">
			<div className="w-full flex gap-3 animate-pulse">
				{/* PICTURE */}
				<div className="w-20 aspect-square rounded-lg bg-[#efe9d6] shrink-0 self-start" />

				{/* NAME, LOCATION, DISTANCE */}
				<div className="w-full flex-1 flex flex-col justify-between">
					<div className="flex flex-col gap-2">
						<div className="h-5 w-3/4 rounded bg-[#efe9d6]" />
						<div className="h-3 w-full rounded bg-[#efe9d6]" />
					</div>
					<div className="h-3 w-12 rounded bg-[#efe9d6] self-end" />
				</div>
			</div>
		</div>
	);
};

// NOTTIFICATION
export const NotifCardSkeleton = () => (
	<div
		className="rounded-md p-2 flex justify-start items-start gap-3 animate-pulse"
		aria-hidden="true">
		{/* ICON */}
		<div className="w-10 h-10 rounded-full bg-[#efe9d6] shrink-0" />

		{/* TITLE, MESSAGE, TIME */}
		<div className="w-full flex flex-col gap-1.5">
			<div className="h-3 w-2/3 rounded bg-[#efe9d6]" />
			<div className="h-2.5 w-full rounded bg-[#efe9d6]" />
			<div className="h-2.5 w-4/5 rounded bg-[#efe9d6]" />
			<div className="h-2 w-12 rounded bg-[#efe9d6] mt-0.5" />
		</div>
	</div>
);

// DOCUMENTATION
export const ReportCardSkeleton = () => (
	<div
		className="rounded-xl p-1.75 flex items-center gap-3 w-full animate-pulse"
		aria-hidden="true">
		{/* BEE PICTURE */}
		<div className="w-30 h-20 shrink-0 rounded-md bg-[#efe9d6]" />

		{/* INFO */}
		<div className="w-full flex flex-col gap-2 min-w-0">
			<div className="flex justify-between items-center gap-2">
				<div className="h-5 w-24 rounded bg-[#efe9d6]" />
				<div className="h-5 w-22 shrink-0 rounded-full bg-[#efe9d6]" />
			</div>
			<div className="h-3.5 w-3/4 rounded bg-[#efe9d6]" />
			<div className="h-3 w-1/2 rounded bg-[#efe9d6]" />
		</div>
	</div>
);

// DOCUMENT: REPORT DETAILS
const Bar = ({ className = "" }: { className?: string }) => (
	<div className={`rounded bg-[#efe9d6] ${className}`} />
);

// Label + value pair (e.g. "Location" -> "Payatas, Quezon City")
const FieldSkeleton = ({ valueWidth = "w-3/4" }: { valueWidth?: string }) => (
	<div className="mt-3 flex flex-col gap-1.5">
		<Bar className="h-3 w-28" />
		<Bar className={`h-4 ${valueWidth}`} />
	</div>
);

export const ReportDetailsSkeleton = () => (
	<div
		className="flex flex-col gap-4 w-full animate-pulse"
		aria-hidden="true">
		<div className="border-2 border-[#e2e2e6] rounded-2xl p-2.5 flex lg:flex-row flex-col gap-5">
			{/* LEFT — PHOTO */}
			<div className="w-full h-56 lg:h-72 rounded-md bg-[#efe9d6]" />

			{/* RIGHT — FIELDS */}
			<div className="w-full">
				<div className="flex justify-between items-start">
					<Bar className="h-5 w-24" />
					<Bar className="h-5 w-22 rounded-full" />
				</div>
				<Bar className="h-7 w-40 mt-2" />

				<FieldSkeleton valueWidth="w-1/2" />
				<FieldSkeleton valueWidth="w-full" />
				<FieldSkeleton valueWidth="w-2/3" />
				<FieldSkeleton valueWidth="w-full" />

				<div className="flex gap-15 items-center mt-3">
					<div className="flex flex-col gap-1.5">
						<Bar className="h-3 w-16" />
						<Bar className="h-4 w-10" />
					</div>
					<div className="flex flex-col gap-1.5">
						<Bar className="h-3 w-16" />
						<Bar className="h-4 w-20" />
					</div>
				</div>

				<FieldSkeleton valueWidth="w-1/3" />
			</div>
		</div>

		{/* MAP */}
		<div className="w-full h-56 rounded-xl bg-[#efe9d6]" />
	</div>
);

export const OfferSkeleton = () => (
	<div
		className="w-full max-w-2xl rounded-xl border border-[#e2e2e6] p-3 flex flex-col gap-3 animate-pulse"
		aria-hidden="true">
		<Bar className="h-4 w-28" />
		{Array.from({ length: 2 }).map((_, i) => (
			<div key={i} className="flex items-center gap-3">
				<div className="w-12 h-12 rounded-full bg-[#efe9d6] shrink-0" />
				<div className="flex-1 flex flex-col gap-2">
					<Bar className="h-4 w-1/2" />
					<Bar className="h-3 w-3/4" />
				</div>
				<Bar className="h-8 w-20 rounded-full" />
			</div>
		))}
	</div>
);

// CHAT PAGE
export const UserMessageCardSkeleton = () => (
	<div
		className="flex items-center gap-3 rounded-lg p-2 animate-pulse"
		aria-hidden="true">
		<div className="relative shrink-0">
			<div className="w-15 h-15 rounded-full bg-[#efe9d6]" />
			<div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white bg-[#e2e2e6]" />
		</div>

		<div className="w-full flex-1 flex flex-col gap-1.5">
			<div className="h-3.5 w-1/2 rounded bg-[#efe9d6]" />
			<div className="h-2.5 w-2/3 rounded bg-[#efe9d6]" />
			<div className="h-3 w-4/5 rounded bg-[#efe9d6]" />
		</div>
	</div>
);

export const ChatMessagesSkeleton = () => {
	const rows: { mine: boolean; w: string }[] = [
		{ mine: false, w: "w-2/5" },
		{ mine: false, w: "w-3/5" },
		{ mine: true, w: "w-1/2" },
		{ mine: false, w: "w-1/3" },
		{ mine: true, w: "w-3/5" },
		{ mine: true, w: "w-2/5" },
	];

	return (
		<div className="flex flex-col gap-2 animate-pulse" aria-hidden="true">
			{rows.map((r, i) => (
				<div
					key={i}
					className={`flex ${r.mine ? "justify-end" : "justify-start"}`}>
					<div
						className={`h-9 ${r.w} rounded-2xl ${
							r.mine ? "bg-[#ffdb4f]/40" : "bg-[#efe9d6]"
						}`}
					/>
				</div>
			))}
		</div>
	);
};

// BEEKEEPER: REPORTS OPERATION
export const OperationSkeleton = () => (
	<div
		className="p-2 flex flex-col rounded-2xl animate-pulse"
		aria-hidden="true">
		<div className="w-full flex gap-3">
			<div className="w-20 aspect-square rounded-lg bg-[#efe9d6] shrink-0 self-start" />

			<div className="w-full min-w-0 flex-1 flex flex-col justify-between">
				<div className="flex flex-col gap-2">
					<div className="flex justify-between items-center gap-2">
						<div className="h-5 w-1/2 rounded bg-[#efe9d6]" />
						<div className="h-6 w-16 rounded-md bg-[#efe9d6] shrink-0" />
					</div>
					<div className="h-3 w-24 rounded bg-[#efe9d6]" />
				</div>
				<div className="h-4 w-28 rounded bg-[#efe9d6] self-end" />
			</div>
		</div>
	</div>
);

// BEEKEEPER: ALERTS
export const PesticideAlertSkeleton = () => (
	<div className="relative pb-1 animate-pulse" aria-hidden="true">
		<div className="px-3 flex items-center rounded-2xl border border-[#efe9d6] bg-[#fffdf5] overflow-hidden">
			<div className="w-full h-20 flex items-center gap-3">
				<div className="w-15 h-15 rounded-full bg-[#efe9d6] shrink-0" />

				<div className="w-full flex flex-col gap-2">
					<div className="flex justify-between items-center gap-2">
						<div className="h-4 w-1/2 rounded bg-[#efe9d6]" />
						<div className="h-6 w-18 rounded-md bg-[#efe9d6] shrink-0" />
					</div>
					<div className="h-3 w-2/3 rounded bg-[#efe9d6]" />
					<div className="h-3 w-1/3 rounded bg-[#efe9d6]" />
				</div>
			</div>
		</div>
	</div>
);

// BEEKEEPER: HIVES TAB
export const HiveTabSkeleton = () => (
	<div
		className="border-2 border-transparent rounded-2xl lg:p-5 p-3 flex lg:gap-5 gap-3 animate-pulse"
		style={{
			boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
		}}
		aria-hidden="true">
		{/* LEFT — icon box */}
		<div className="p-5 rounded-md bg-[#efe9d6] shrink-0 self-start">
			<div className="lg:w-15 w-10 lg:h-15 h-10 rounded-full bg-[#e3dcc3]" />
		</div>

		{/* RIGHT */}
		<div className="w-full flex flex-col gap-2">
			<div className="flex justify-between items-center">
				<Bar className="h-6 w-24" />
				<Bar className="h-5 w-16" />
			</div>
			<Bar className="h-4 w-1/2" />
			<div className="flex flex-col gap-1.5">
				<Bar className="h-3 w-2/3" />
				<Bar className="h-3 w-3/5" />
			</div>
			<div className="flex justify-between items-center mt-3">
				<div className="flex flex-col gap-1.5">
					<Bar className="h-3 w-20" />
					<Bar className="h-4 w-12" />
				</div>
				<div className="flex flex-col gap-1.5">
					<Bar className="h-3 w-16" />
					<Bar className="h-4 w-14" />
				</div>
			</div>
		</div>
	</div>
);

// BEEKEEPER: HiveDetailsContainer
export const HiveDetailsSkeleton = () => (
	<div
		className="flex flex-col gap-4 w-full max-w-md animate-pulse"
		aria-hidden="true">
		<div
			className="border-2 border-[#e2e2e6] rounded-2xl p-5 flex flex-col lg:flex-row gap-5"
			style={{
				boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
			}}>
			{/* LEFT — icon box */}
			<div className="p-6 lg:p-10 rounded-md bg-[#efe9d6] shrink-0 mx-auto lg:mx-0 self-start">
				<div className="w-20 h-20 rounded-full bg-[#e3dcc3]" />
			</div>

			{/* RIGHT */}
			<div className="w-full flex flex-col">
				<Bar className="h-7 w-28" />
				<Bar className="h-6 w-2/3 mt-2 mb-4" />

				<div className="flex flex-col gap-1.5 mb-8 lg:mb-15">
					<Bar className="h-3.5 w-3/4" />
					<Bar className="h-3.5 w-2/3" />
					<Bar className="h-3.5 w-1/2" />
				</div>

				<Bar className="h-3.5 w-28" />
				<Bar className="h-4 w-14 mt-1.5" />

				<div className="flex justify-between items-center mt-5">
					<div className="flex flex-col gap-1.5">
						<Bar className="h-3.5 w-16" />
						<Bar className="h-4 w-14" />
					</div>
					<div className="flex flex-col gap-1.5">
						<Bar className="h-3.5 w-20" />
						<Bar className="h-4 w-16" />
					</div>
				</div>
			</div>
		</div>

		{/* BUTTONS */}
		<div className="flex flex-col items-center justify-center gap-5">
			<div className="w-full flex flex-col lg:flex-row items-center justify-center gap-3">
				<div className="h-10 w-full lg:w-1/2 rounded-full bg-[#efe9d6]" />
				<div className="h-10 w-full lg:w-1/2 rounded-full bg-[#efe9d6]" />
			</div>
			<Bar className="h-4 w-32" />
		</div>
	</div>
);

// BEEKEEPER: HISTORY YEAR TAB
export const YearFilterSkeleton = () => (
	<div
		className="h-8.5 w-16 rounded-full bg-[#efe9d6] animate-pulse"
		aria-hidden="true"
	/>
);

// BEEKEEPER: HISTORY QUEEN REPLACEMENT
export const BQHistoryCardSkeleton = () => (
	<div
		className="bg-white p-4 rounded-lg flex flex-col gap-2 animate-pulse"
		style={{
			boxShadow:
				"rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px",
		}}
		aria-hidden="true">
		{/* HEADER */}
		<div className="flex justify-between items-center">
			<div className="h-5 w-1/3 rounded bg-[#efe9d6]" />
			<div className="h-5 w-16 rounded-md bg-[#efe9d6]" />
		</div>

		{/* ROWS: Queen installed, Last evaluated, Status */}
		{[
			{ label: "w-24", value: "w-20" },
			{ label: "w-24", value: "w-20" },
			{ label: "w-10", value: "w-24" },
		].map((r, i) => (
			<div key={i} className="flex justify-between items-center">
				<div className={`h-3 ${r.label} rounded bg-[#efe9d6]`} />
				<div className={`h-3 ${r.value} rounded bg-[#efe9d6]`} />
			</div>
		))}

		{/* REASON */}
		<div className="border-t border-[#f0e6d2] pt-2 mt-1 flex flex-col gap-1.5">
			<div className="h-2.5 w-full rounded bg-[#efe9d6]" />
			<div className="h-2.5 w-3/4 rounded bg-[#efe9d6]" />
		</div>
	</div>
);
