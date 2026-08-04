const MONTH_NAMES = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toMonthIndex(period: string): number {
	const [y, m] = period.split("-").map(Number);
	return y * 12 + (m - 1);
}

export function formatPeriod(period: string): string {
	const [y, m] = period.split("-").map(Number);
	return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function periodYear(period: string): number {
	return Number(period.split("-")[0]);
}

export interface SeasonedPoint {
	period: string;
	value: number;
	season: number;
	shortLabel: string; // e.g. "May 2023"
}

/**
 * Groups a sparse (harvest-only) monthly series into "harvest seasons".
 *
 * A season holds 1–3 harvest entries. A new season starts when
 * EITHER of these happens first:
 *   (a) the current season already has `maxHarvestsPerSeason` (3)
 *       entries, or
 *   (b) the gap since the previous harvest exceeds
 *       `offSeasonGapMonths` (5+ months with no harvest — treated
 *       as a full off-season break), even if the current season
 *       hasn't reached 3 entries yet.
 *
 * Example: May, Sep, Oct 2023 -> Season 1 (hits the cap of 3).
 * Dec 2023, Feb, Mar 2024 -> Season 2 (hits the cap of 3).
 * May 2024 -> Season 3 (starts fresh).
 * If instead a hive only harvested twice (e.g. May, Sep) before a
 * long off-season gap, that season would close at 2 entries rather
 * than waiting for a 3rd that never comes.
 *
 * NOTE: this is a frontend presentation heuristic — there is no
 * season_id / season_number column in the DB (checked
 * beeguard_system.sql: `yields` only has yield_id, hive_id,
 * yield_date, yield_kg). If the real BeeGuard business rule ties
 * seasons to something else (queen install date, an explicit
 * production cycle, etc.), replace the grouping logic below —
 * the rest of the pipeline (buildSeasonLabels, chart) doesn't care
 * how `season` is computed, only that points sharing the same
 * season number are contiguous.
 */
export function groupHarvestSeasons(
	categories: string[],
	data: number[],
	maxHarvestsPerSeason = 3,
	offSeasonGapMonths = 4,
): SeasonedPoint[] {
	let season = 0;
	let countInSeason = 0;
	let prevIdx: number | null = null;

	return categories.map((period, i) => {
		const idx = toMonthIndex(period);
		const bigGap = prevIdx !== null && idx - prevIdx > offSeasonGapMonths;
		const capReached = countInSeason >= maxHarvestsPerSeason;

		if (prevIdx === null || bigGap || capReached) {
			season += 1;
			countInSeason = 0;
		}
		countInSeason += 1;
		prevIdx = idx;

		return {
			period,
			value: data[i] ?? 0,
			season,
			shortLabel: formatPeriod(period),
		};
	});
}

/**
 * Chart.js-ready labels: first point of each season -> a two-line
 * "Harvest Season N / Mon YYYY" tick; subsequent points in the same
 * season -> just "Mon YYYY".
 */
export function buildSeasonLabels(points: SeasonedPoint[]): string[] {
	const seen = new Set<number>();
	return points.map((p) => {
		if (!seen.has(p.season)) {
			seen.add(p.season);
			return `Harvest Season ${p.season}\n${p.shortLabel}`;
		}
		return p.shortLabel;
	});
}