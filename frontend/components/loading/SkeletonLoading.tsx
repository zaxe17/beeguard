import type { ReactNode } from "react";
import { AlertContainer } from "../ui/Alert";

// SHARED SKELETON BLOCK
// Default: rounded + #efe9d6. Pass your own rounded-* or bg-* to override.
const Bar = ({
	className = "",
	children,
}: {
	className?: string;
	children?: ReactNode;
}) => {
	const hasRounded = /(^|\s)rounded/.test(className);
	const hasBg = /(^|\s)bg-/.test(className);

	return (
		<div
			className={`${hasRounded ? "" : "rounded"} ${
				hasBg ? "" : "bg-[#efe9d6]"
			} ${className}`}>
			{children}
		</div>
	);
};

// Label + value pair (e.g. "Location" -> "Payatas, Quezon City")
const FieldSkeleton = ({ valueWidth = "w-3/4" }: { valueWidth?: string }) => (
	<div className="mt-3 flex flex-col gap-1.5">
		<Bar className="h-3 w-28" />
		<Bar className={`h-4 ${valueWidth}`} />
	</div>
);

// BEEFARM CONTAINER
export const BeefarmSkeleton = () => {
	return (
		<div className="p-1.5 flex flex-col rounded-2xl" aria-hidden="true">
			<div className="w-full flex gap-3 animate-pulse">
				{/* PICTURE */}
				<Bar className="w-20 aspect-square rounded-lg shrink-0 self-start" />

				{/* NAME, LOCATION, DISTANCE */}
				<div className="w-full flex-1 flex flex-col justify-between">
					<div className="flex flex-col gap-2">
						<Bar className="h-5 w-3/4" />
						<Bar className="h-3 w-full" />
					</div>
					<Bar className="h-3 w-12 self-end" />
				</div>
			</div>
		</div>
	);
};

// NOTIFICATION
export const NotifCardSkeleton = () => (
	<div
		className="rounded-md p-2 flex justify-start items-start gap-3 animate-pulse"
		aria-hidden="true">
		{/* ICON */}
		<Bar className="w-10 h-10 rounded-full shrink-0" />

		{/* TITLE, MESSAGE, TIME */}
		<div className="w-full flex flex-col gap-1.5">
			<Bar className="h-3 w-2/3" />
			<Bar className="h-2.5 w-full" />
			<Bar className="h-2.5 w-4/5" />
			<Bar className="h-2 w-12 mt-0.5" />
		</div>
	</div>
);

// DOCUMENTATION
export const ReportCardSkeleton = () => (
	<div
		className="rounded-xl p-1.75 flex items-center gap-3 w-full animate-pulse"
		aria-hidden="true">
		{/* BEE PICTURE */}
		<Bar className="w-30 h-20 shrink-0 rounded-md" />

		{/* INFO */}
		<div className="w-full flex flex-col gap-2 min-w-0">
			<div className="flex justify-between items-center gap-2">
				<Bar className="h-5 w-24" />
				<Bar className="h-5 w-22 shrink-0 rounded-full" />
			</div>
			<Bar className="h-3.5 w-3/4" />
			<Bar className="h-3 w-1/2" />
		</div>
	</div>
);

// DOCUMENT: REPORT DETAILS
export const ReportDetailsSkeleton = ({
	showMap = true,
}: {
	showMap?: boolean;
}) => (
	<div
		className="flex flex-col gap-4 w-full animate-pulse"
		aria-hidden="true">
		<div
			className="border-2 border-[#e2e2e6] rounded-2xl p-2.5 flex lg:flex-row flex-col gap-5"
			style={{
				boxShadow: `rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px`,
			}}>
			{/* LEFT — PHOTO */}
			<Bar className="w-full h-56 lg:h-80 rounded-md" />

			{/* RIGHT — FIELDS */}
			<div className="w-full">
				<div className="flex justify-between items-start">
					<Bar className="h-5 w-24" />
					<Bar className="h-5 w-22 rounded-full" />
				</div>
				<Bar className="h-7 w-40 mt-2" />
				<FieldSkeleton valueWidth="w-1/2" /> {/* Bee Specification */}
				<FieldSkeleton valueWidth="w-full" /> {/* Location */}
				<FieldSkeleton valueWidth="w-2/3" /> {/* Date & Time */}
				<FieldSkeleton valueWidth="w-full" /> {/* Details */}
				<FieldSkeleton valueWidth="w-1/4" /> {/* Danger */}
				<FieldSkeleton valueWidth="w-1/3" /> {/* Payment Method */}
			</div>
		</div>

		{/* MAP */}
		{showMap && (
			<div className="flex flex-col gap-1">
				<Bar className="w-full h-56 rounded-xl" />
				<Bar className="h-3 w-24 self-end" />
			</div>
		)}
	</div>
);

export const OfferSkeleton = () => (
	<div
		className="w-full max-w-2xl rounded-xl border border-[#e2e2e6] p-3 flex flex-col gap-3 animate-pulse"
		aria-hidden="true">
		<Bar className="h-4 w-28" />
		{Array.from({ length: 2 }).map((_, i) => (
			<div key={i} className="flex items-center gap-3">
				<Bar className="w-12 h-12 rounded-full shrink-0" />
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
			<Bar className="w-15 h-15 rounded-full" />
			<Bar className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white bg-[#e2e2e6]" />
		</div>

		<div className="w-full flex-1 flex flex-col gap-1.5">
			<Bar className="h-3.5 w-1/2" />
			<Bar className="h-2.5 w-2/3" />
			<Bar className="h-3 w-4/5" />
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
					<Bar
						className={`h-9 ${r.w} rounded-2xl ${
							r.mine ? "bg-[#ffdb4f]/40" : ""
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
			<Bar className="w-20 aspect-square rounded-lg shrink-0 self-start" />

			<div className="w-full min-w-0 flex-1 flex flex-col justify-between">
				<div className="flex flex-col gap-2">
					<div className="flex justify-between items-center gap-2">
						<Bar className="h-5 w-1/2" />
						<Bar className="h-6 w-16 rounded-md shrink-0" />
					</div>
					<Bar className="h-3 w-24" />
				</div>
				<Bar className="h-4 w-28 self-end" />
			</div>
		</div>
	</div>
);

// BEEKEEPER: ALERTS
export const PesticideAlertSkeleton = () => (
	<div className="relative pb-1 animate-pulse" aria-hidden="true">
		<div className="px-3 flex items-center rounded-2xl border border-[#efe9d6] bg-[#fffdf5] overflow-hidden">
			<div className="w-full h-20 flex items-center gap-3">
				<Bar className="w-15 h-15 rounded-full shrink-0" />

				<div className="w-full flex flex-col gap-2">
					<div className="flex justify-between items-center gap-2">
						<Bar className="h-4 w-1/2" />
						<Bar className="h-6 w-18 rounded-md shrink-0" />
					</div>
					<Bar className="h-3 w-2/3" />
					<Bar className="h-3 w-1/3" />
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
		<Bar className="p-5 rounded-md shrink-0 self-start">
			<Bar className="lg:w-15 w-10 lg:h-15 h-10 rounded-full bg-[#e3dcc3]" />
		</Bar>

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
			<Bar className="p-6 lg:p-10 rounded-md shrink-0 mx-auto lg:mx-0 self-start">
				<Bar className="w-20 h-20 rounded-full bg-[#e3dcc3]" />
			</Bar>

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
				<Bar className="h-10 w-full lg:w-1/2 rounded-full" />
				<Bar className="h-10 w-full lg:w-1/2 rounded-full" />
			</div>
			<Bar className="h-4 w-32" />
		</div>
	</div>
);

// BEEKEEPER: HISTORY YEAR TAB
export const YearFilterSkeleton = () => (
	<div aria-hidden="true" className="animate-pulse">
		<Bar className="h-8.5 w-16 rounded-full" />
	</div>
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
			<Bar className="h-5 w-1/3" />
			<Bar className="h-5 w-16 rounded-md" />
		</div>

		{/* ROWS: Queen installed, Last evaluated, Status */}
		{[
			{ label: "w-24", value: "w-20" },
			{ label: "w-24", value: "w-20" },
			{ label: "w-10", value: "w-24" },
		].map((r, i) => (
			<div key={i} className="flex justify-between items-center">
				<Bar className={`h-3 ${r.label}`} />
				<Bar className={`h-3 ${r.value}`} />
			</div>
		))}

		{/* REASON */}
		<div className="border-t border-[#f0e6d2] pt-2 mt-1 flex flex-col gap-1.5">
			<Bar className="h-2.5 w-full" />
			<Bar className="h-2.5 w-3/4" />
		</div>
	</div>
);

// BEEKEEPER: VIEW HISTORY (Monitoring / Harvest table)
export const HistoryTableSkeleton = ({
	groups = [3, 2],
}: {
	groups?: number[];
}) => (
	<div className="w-full flex flex-col animate-pulse" aria-hidden="true">
		{groups.map((rows, g) => (
			<div key={g} className="flex flex-col">
				{/* MONTH HEADER */}
				<div className="px-4 py-3 border-b border-[#e0e0e0]">
					<Bar className="h-4 w-28" />
				</div>

				{/* ROWS: date, status/yield, delete */}
				{Array.from({ length: rows }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 px-4 py-3 border-b border-[#e0e0e0] last:border-b-0">
						<div className="flex-1 flex justify-center">
							<Bar className="h-3.5 w-20" />
						</div>
						<div className="flex-1 flex justify-center">
							<Bar
								className={`h-3.5 ${i % 2 === 0 ? "w-24" : "w-16"}`}
							/>
						</div>
						<Bar className="w-7 h-7 rounded-full shrink-0" />
					</div>
				))}
			</div>
		))}
	</div>
);

// BEEKEEPER: VIEW HISTORY — HiveTrans card
export const HiveTransSkeleton = () => (
	<div className="rounded-2xl flex gap-5 animate-pulse" aria-hidden="true">
		{/* LEFT — icon box */}
		<Bar className="p-5 rounded-md shrink-0 border border-[#e3dcc3]">
			<Bar className="w-15 h-15 rounded-full bg-[#e3dcc3]" />
		</Bar>

		{/* RIGHT — name, species, established */}
		<div className="w-full flex flex-col gap-2 pt-1">
			<Bar className="h-6 w-32" />
			<div className="flex flex-col gap-1.5">
				<Bar className="h-3 w-36" />
				<Bar className="h-3 w-44" />
			</div>
		</div>
	</div>
);

// BEEKEEPER: ALERT DETAILS PAGE
export const AlertDetailsSkeleton = () => (
	<div
		className="w-full flex lg:flex-row flex-col gap-8 lg:gap-15 lg:py-15 lg:px-20 pb-5 animate-pulse"
		aria-hidden="true">
		{/* MOBILE HEADER */}
		<div className="lg:hidden w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6]">
			<Bar className="w-6 h-6 rounded-full shrink-0" />
			<div className="w-full flex justify-center">
				<Bar className="h-4 w-12" />
			</div>
		</div>

		{/* LEFT */}
		<div className="lg:w-1/2 w-full flex flex-col gap-8 px-4 lg:px-0">
			{/* DETAILS */}
			<AlertContainer title="Alert Details">
				<div className="w-full flex items-center gap-4">
					<Bar className="w-15 h-15 rounded-full shrink-0" />
					<div className="w-full flex flex-col gap-1.5">
						<div className="flex justify-between items-center">
							<Bar className="h-4 w-44" />
							<Bar className="h-5 w-18 rounded-md" />
						</div>
						<Bar className="h-3 w-40" />
						<Bar className="h-3 w-32 mb-5" />
						<Bar className="h-3 w-1/2" />
						<Bar className="h-3 w-2/5" />
					</div>
				</div>
			</AlertContainer>

			{/* INFORMATION */}
			<AlertContainer title="Alert Information">
				<div className="w-full flex flex-col gap-3">
					{["w-24", "w-40", "w-14", "w-28", "w-24"].map((w, i) => (
						<div
							key={i}
							className="flex justify-between items-center">
							<Bar className="h-3.5 w-24" />
							<Bar className={`h-3.5 ${w}`} />
						</div>
					))}
				</div>
			</AlertContainer>

			{/* VALIDITY */}
			<AlertContainer title="Alert Validity">
				<div className="w-full flex flex-col gap-2">
					<div className="flex justify-between items-end">
						<Bar className="h-4 w-28" />
						<Bar className="h-3 w-20" />
					</div>
					<Bar className="w-full h-2.5 rounded-full" />
					<div className="flex justify-between">
						<Bar className="h-3 w-14" />
						<Bar className="h-3 w-36" />
					</div>
					<div className="flex flex-col gap-1.5 mt-1">
						<Bar className="h-2.5 w-full" />
						<Bar className="h-2.5 w-full" />
						<Bar className="h-2.5 w-3/4" />
					</div>
				</div>
			</AlertContainer>

			{/* RECOMMENDATION */}
			<div className="bg-[#ff0000]/5 rounded-lg p-5 flex flex-col gap-2">
				<Bar className="h-4 w-52 mb-1" />
				{["w-3/5", "w-2/3", "w-3/5", "w-1/2"].map((w, i) => (
					<div key={i} className="flex items-center gap-2">
						<Bar className="w-4 h-4 rounded-full shrink-0" />
						<Bar className={`h-3 ${w}`} />
					</div>
				))}
			</div>
		</div>

		{/* RIGHT */}
		<div className="lg:w-1/2 w-full px-4 lg:px-0">
			{/* MAP */}
			<Bar className="h-6 w-16 mb-2" />
			<Bar className="w-full h-80 rounded-xl mb-8" />

			{/* TIMELINE */}
			<Bar className="h-6 w-36 mb-2" />
			<div className="flex flex-col">
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex gap-3">
						<div className="flex flex-col items-center">
							<Bar className="w-3 h-3 rounded-full shrink-0" />
							{i < 2 && (
								<span className="w-px flex-1 bg-[#e5e7eb] my-1" />
							)}
						</div>
						<div
							className={`flex flex-col gap-1.5 ${i < 2 ? "pb-6" : ""}`}>
							<Bar className="h-3.5 w-40" />
							<Bar className="h-3 w-32" />
						</div>
					</div>
				))}
			</div>
		</div>
	</div>
);

// BEEKEEPER: BEE REPORT (details + Reported By)
export const BeeReportSkeleton = () => (
	<div className="flex flex-col gap-4 w-full" aria-hidden="true">
		<ReportDetailsSkeleton showMap={false} />

		<div className="flex flex-col gap-1 animate-pulse">
			<div className="flex items-center justify-between gap-1">
				<Bar className="h-4 w-24" />
				<Bar className="h-4 w-36" />
			</div>

			<div className="w-full flex lg:flex-row flex-col items-center gap-3 p-2">
				<div className="flex items-center w-full gap-2">
					<Bar className="w-15 h-15 rounded-full shrink-0" />
					<div className="flex flex-col gap-1.5">
						<Bar className="h-4 w-32" />
						<Bar className="h-3 w-40" />
					</div>
				</div>

				<div className="lg:ml-auto lg:pr-3 lg:w-auto w-full flex items-center gap-2">
					<Bar className="h-10 w-40 rounded-full" />
					<Bar className="h-10 w-40 rounded-full" />
				</div>
			</div>
		</div>
	</div>
);

// GRAPH: YieldSummaryChart
export const YieldChartSkeleton = ({
	showSummary = true,
	legendCount = 3,
}: {
	showSummary?: boolean;
	legendCount?: number;
}) => (
	<div
		className="w-full h-full flex flex-col items-stretch gap-4 animate-pulse"
		aria-hidden="true">
		{/* SUMMARY — value + change */}
		{showSummary && (
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1.5">
					<Bar className="h-4 w-16" />
					<Bar className="h-3 w-28" />
				</div>
				<div className="flex flex-col gap-1.5 items-end">
					<Bar className="h-4 w-32" />
					<Bar className="h-3 w-24" />
				</div>
			</div>
		)}

		{/* LEGEND */}
		<div className="flex justify-center flex-wrap gap-4">
			{Array.from({ length: legendCount }).map((_, i) => (
				<div key={i} className="flex items-center gap-1.5">
					<Bar className="w-8 h-3 rounded-sm" />
					<Bar className="h-3 w-14" />
				</div>
			))}
		</div>

		{/* CHART AREA */}
		<div className="flex-1 min-h-60 flex gap-2">
			{/* Y-AXIS LABELS */}
			<div className="flex flex-col justify-between pb-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<Bar key={i} className="h-2.5 w-6" />
				))}
			</div>

			<div className="flex-1 flex flex-col">
				{/* GRID LINES */}
				<div className="flex-1 flex flex-col justify-between border-l-2 border-b-2 border-[#efe9d6]">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="w-full h-px bg-[#efe9d6]/70" />
					))}
					<div />
				</div>

				{/* X-AXIS LABELS */}
				<div className="flex justify-between pt-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<Bar key={i} className="h-2.5 w-10" />
					))}
				</div>
			</div>
		</div>
	</div>
);

// BEE FARM VIEW (profile page)
export const BeefarmViewSkeleton = ({
	showActions = true,
}: {
	showActions?: boolean;
}) => (
	<div
		className="w-full flex-1 overflow-hidden animate-pulse"
		aria-hidden="true">
		{/* COVER PHOTO */}
		<div className="relative w-full lg:h-60 h-50">
			<Bar className="absolute inset-0 rounded-none" />

			{/* PROFILE PICTURE — desktop */}
			<Bar className="hidden lg:block absolute left-4 -bottom-15 w-30 h-30 rounded-full border-4 border-white shadow-md bg-[#e3dcc3]" />
		</div>

		<div className="flex justify-between lg:flex-row flex-col gap-3 px-4 pt-2">
			{/* LEFT SIDE */}
			<div className="w-full">
				{/* NAME + VERIFY */}
				<div className="flex items-center gap-3 w-full lg:pl-33 pl-0">
					{/* PROFILE PICTURE — mobile */}
					<Bar className="block lg:hidden w-20 h-20 rounded-full border-4 border-white shadow-md shrink-0 bg-[#e3dcc3]" />
					<div className="flex flex-col gap-2">
						<Bar className="h-7 w-48" />
						<Bar className="h-4 w-20 rounded-full" />
					</div>
				</div>

				{/* STARS + REVIEWS */}
				<div className="flex items-center gap-1 mt-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<Bar key={i} className="w-6 h-6 rounded-full" />
					))}
					<Bar className="h-4 w-28 ml-2" />
				</div>

				{/* RATE CARDS */}
				<div className="w-full flex gap-3 mt-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="w-full border border-[#e2e2e6] rounded-full p-2 flex flex-col items-center gap-1.5">
							<Bar className="h-4 w-8" />
							<Bar className="h-3 w-14" />
						</div>
					))}
				</div>
			</div>

			{/* RIGHT SIDE */}
			<div className="lg:w-2/3 w-full">
				{/* BUTTONS */}
				{showActions && (
					<div className="flex gap-2 mt-3">
						<Bar className="h-10 w-full rounded-full" />
						<Bar className="h-10 w-full rounded-full" />
					</div>
				)}

				{/* FOLLOWERS */}
				<Bar className="h-3 w-20 mt-3" />

				{/* ABOUT */}
				<div className="flex flex-col gap-1.5 mt-4 pl-2">
					<Bar className="h-4 w-14" />
					<Bar className="h-3 w-full" />
					<Bar className="h-3 w-3/4" />
				</div>

				{/* LOCATION */}
				<div className="flex flex-col gap-1.5 mt-4 pl-2">
					<Bar className="h-4 w-18" />
					<Bar className="h-3 w-2/3" />
				</div>
			</div>
		</div>
	</div>
);
