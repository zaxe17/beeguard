import { YieldSummaryChart } from "@/components/graph/Line";

function formatKg(v: number | undefined | null) {
	return `${(v ?? 0).toFixed(1)}kg`;
}

const summary = {
	yield_totals: {
		this_month: {
			total_kg: 12450.75,
		},
		change_amount: 850.25,
		change_percent: 7.3,
	},
};

const trend = {
	categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
	data: [8200, 9100, 8700, 10300, 11200, 11600, 12450],
};

const YearFilter = ({ year }: { year: string }) => {
	return (
		<button className="relative border border-[#a6a3a3] border-solid text-[#4A2F00] py-1 px-3 rounded-full overflow-hidden group">
			<span className="absolute inset-0 bg-linear-to-r from-[#ffdb4f] to-[#eec572] opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out" />

			<span className="relative Poppins-SemiBold">{year}</span>
		</button>
	);
};

const History = () => {
	return (
		<div className="h-full w-full flex justify-center items-center">
			<div className="h-full w-full flex flex-col justify-center pt-10 p-5">
				{/* FILTER BUTTON */}
				<div className="flex justify-start gap-3 mb-6">
					<YearFilter year="2026" />
					<YearFilter year="2025" />
					<YearFilter year="2024" />
					<YearFilter year="2023" />
					<YearFilter year="All" />
				</div>

				<div className="w-full h-screen">
					<YieldSummaryChart
						value={formatKg(
							summary?.yield_totals.this_month.total_kg,
						)}
						valueLabel="Yield This Month"
						changeAmount={summary?.yield_totals.change_amount ?? 0}
						changePercent={
							summary?.yield_totals.change_percent ?? 0
						}
						categories={
							trend.categories.length
								? trend.categories
								: ["No data"]
						}
						data={trend.data.length ? trend.data : [0]}
					/>
				</div>
			</div>
		</div>
	);
};

export default History;
