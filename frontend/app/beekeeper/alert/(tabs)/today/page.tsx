import { PesticideAlert, AlertProps } from "@/components/ui/Alert";

import pesticideDetailsData from "@/data/pesticideDetails.json";
const pesticideAlert = pesticideDetailsData as AlertProps[];

const TodayAlert = () => {
	return (
		<div className="w-full h-full flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden min-h-0 py-1 px-3">
			{pesticideAlert
				.filter((pa) => {
					const alertDate = new Date(pa.date);
					const today = new Date();

					return (
						alertDate.getDate() === today.getDate() &&
						alertDate.getMonth() === today.getMonth() &&
						alertDate.getFullYear() === today.getFullYear()
					);
				})
				.sort(
					(a, b) =>
						new Date(a.date).getTime() - new Date(b.date).getTime(),
				)
				.map((pa, i) => (
					<PesticideAlert
						key={i}
						location={pa.location}
						date={pa.date}
						time={pa.time}
						status={pa.status}
					/>
				))}
		</div>
	);
};

export default TodayAlert;
