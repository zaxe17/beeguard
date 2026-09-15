export type ReportStatus = "pending" | "progress" | "resolved";

export type ReportData = {
	reportId: string;
	status: ReportStatus;
	specification: string;
	location: string;
	date: string;
	time: string;
	details: string;
	activity: string;
	danger: string;
};

export const dummyReports: ReportData[] = [
	{
		reportId: "BG-2026-001",
		status: "pending",
		specification: "Apis cerana / Asian Honey Bee",
		location: "Payatas, Quezon City",
		date: "March 29, 2026",
		time: "9:41 am",
		details: "Near basketball court, on a mango tree.",
		activity: "Calm",
		danger: "Yes",
	},
	{
		reportId: "BG-2026-002",
		status: "pending",
		specification: "Apis mellifera / Western Honey Bee",
		location: "Batasan Hills, Quezon City",
		date: "March 30, 2026",
		time: "2:15 pm",
		details: "Under the roof eaves of a residential house.",
		activity: "Aggressive",
		danger: "Yes",
	},
	{
		reportId: "BG-2026-003",
		status: "progress",
		specification: "Apis cerana / Asian Honey Bee",
		location: "Commonwealth, Quezon City",
		date: "March 28, 2026",
		time: "11:03 am",
		details: "Inside an abandoned electrical box near the street.",
		activity: "Calm",
		danger: "No",
	},
	{
		reportId: "BG-2026-004",
		status: "progress",
		specification: "Apis dorsata / Giant Honey Bee",
		location: "Fairview, Quezon City",
		date: "March 27, 2026",
		time: "4:47 pm",
		details: "Hanging on a tree branch beside the barangay hall.",
		activity: "Calm",
		danger: "Yes",
	},
	{
		reportId: "BG-2026-005",
		status: "progress",
		specification: "Apis cerana / Asian Honey Bee",
		location: "Novaliches, Quezon City",
		date: "March 26, 2026",
		time: "8:20 am",
		details: "Small swarm near a water tank on rooftop.",
		activity: "Calm",
		danger: "No",
	},
	{
		reportId: "BG-2026-006",
		status: "resolved",
		specification: "Apis mellifera / Western Honey Bee",
		location: "Diliman, Quezon City",
		date: "March 20, 2026",
		time: "1:10 pm",
		details: "Beehive removed successfully from garage ceiling.",
		activity: "Calm",
		danger: "No",
	},
	{
		reportId: "BG-2026-007",
		status: "resolved",
		specification: "Apis cerana / Asian Honey Bee",
		location: "Cubao, Quezon City",
		date: "March 18, 2026",
		time: "10:35 am",
		details: "Colony relocated from a school building wall.",
		activity: "Aggressive",
		danger: "Yes",
	},
	{
		reportId: "BG-2026-008",
		status: "resolved",
		specification: "Apis dorsata / Giant Honey Bee",
		location: "Project 6, Quezon City",
		date: "March 15, 2026",
		time: "3:50 pm",
		details: "Large hive removed from a tree along the highway.",
		activity: "Calm",
		danger: "Yes",
	},
	{
		reportId: "BG-2026-009",
		status: "pending",
		specification: "Apis mellifera / Western Honey Bee",
		location: "Tandang Sora, Quezon City",
		date: "March 31, 2026",
		time: "7:05 am",
		details: "Bees swarming near a jeepney terminal.",
		activity: "Aggressive",
		danger: "Yes",
	},
	{
		reportId: "BG-2026-010",
		status: "progress",
		specification: "Apis cerana / Asian Honey Bee",
		location: "Kamuning, Quezon City",
		date: "March 25, 2026",
		time: "5:30 pm",
		details: "Hive found in a hollow tree beside a public market.",
		activity: "Calm",
		danger: "No",
	},
];