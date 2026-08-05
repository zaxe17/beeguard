import { api } from "./api";

export type QueenLevel = "Normal" | "Monitor" | "Replace";

// One row per hive owned by the current beekeeper — powers the
// History tab's queen-replacement grid (below the yield line
// graph). Backed by GET /api/queen/history.
export interface QueenHistoryRow {
	hive_id: string;
	hive_name: string;
	level: QueenLevel;
	reason: string;
	evaluated_at: string | null;
	resolved_at: string | null;
	queen_installed_date: string | null;
	// True when the latest Monitor/Replace recommendation was actually
	// acted on — i.e. a queen was installed on/after the evaluation
	// date, as opposed to the recommendation just being superseded.
	replaced: boolean;
}

export const queenService = {
	// Signature matches the call site in HivesModal.tsx:
	//   queenService.confirmReplacement(hiveId, replacementDate)
	confirmReplacement: (hiveId: string, installedOn: string | null) =>
		api.post<{ level: QueenLevel }>(`/queen/${hiveId}/confirm-replacement`, {
			installed_on: installedOn,
		}),

	// Powers the History tab's queen-replacement grid.
	historyForBeekeeper: () => api.get<QueenHistoryRow[]>("/queen/history"),
};