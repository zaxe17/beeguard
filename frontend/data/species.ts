// data/species.ts
//
// One place for how a bee species is shown everywhere in the app:
// scientific name (genus capitalized, species lowercase) + English name,
// e.g. "Apis cerana / Asian Honey Bee".
//
// Keys are the class names the YOLO model (weights/best.pt) returns and
// that get saved in cv_scans.identified_species / reports.ai_species_identified.
// Keep in sync with SPECIES_ENGLISH_NAMES in server/services/notification_service.py.

export const SPECIES_ENGLISH_NAMES: Record<string, string> = {
	// Honey bees (genus Apis)
	"Apis mellifera": "Western Honey Bee",
	"Apis cerana": "Asian Honey Bee",
	"Apis dorsata": "Giant Honey Bee",
	"Apis breviligula": "Philippine Giant Honey Bee",
	"Apis florea": "Red Dwarf Honey Bee",
	"Apis andreniformis": "Black Dwarf Honey Bee",
	"Apis laboriosa": "Himalayan Giant Honey Bee",
	"Apis koschevnikovi": "Koschevnikov's Honey Bee",
	"Apis nuluensis": "Mount Kinabalu Honey Bee",
	// Stingless bees (genus Tetragonula) found in the Philippines
	"Tetragonula biroi": "Philippine Stingless Bee",
	"Tetragonula iridipennis": "Stingless Bee",
	"Tetragonula laeviceps": "Stingless Bee",
	"Tetragonula sapiens": "Stingless Bee",
};

// "apis CERANA" -> "Apis cerana" (binomial naming style).
const formatScientific = (name: string) => {
	const [genus = "", ...rest] = name.trim().split(/\s+/);
	return [
		genus.charAt(0).toUpperCase() + genus.slice(1).toLowerCase(),
		...rest.map((w) => w.toLowerCase()),
	].join(" ");
};

// NEW — the species a beekeeper can choose for a hive (Add Hive
// dropdown). Saved as the scientific name in hives.bee_species.
// Keep in sync with HIVE_SPECIES in server/validators/hive_validator.py.
// Honey bees first, then stingless bees; the ones most kept in the
// Philippines first in each group.
export const HIVE_SPECIES_GROUPS: { group: string; species: string[] }[] = [
	{
		group: "Honey Bees",
		species: [
			"Apis mellifera",
			"Apis cerana",
			"Apis dorsata",
			"Apis breviligula",
			"Apis nigrocincta",
			"Apis florea",
			"Apis andreniformis",
			"Apis laboriosa",
			"Apis koschevnikovi",
			"Apis nuluensis",
		],
	},
	{
		group: "Stingless Bees",
		species: [
			"Tetragonula biroi",
			"Tetragonula iridipennis",
			"Tetragonula laeviceps",
			"Tetragonula sapiens",
		],
	},
];

export const HIVE_SPECIES = HIVE_SPECIES_GROUPS.flatMap((g) => g.species);

/** "Apis cerana" -> "Apis cerana / Asian Honey Bee". */
export const speciesLabel = (species: string | null | undefined): string => {
	if (!species) return "Unidentified";
	// CV scan: a bee that isn't cerana / mellifera / biroi (e.g. Apis dorsata).
	if (species === "Unidentified") return "Unidentified Bee";
	// Already "Scientific / English" (e.g. older dummy data) — keep as-is.
	if (species.includes("/")) return species;
	const scientific = formatScientific(species);
	const english = SPECIES_ENGLISH_NAMES[scientific];
	return english ? `${scientific} / ${english}` : scientific;
};

// Dropdown options for HIVE_SPECIES: value = scientific name (what's
// saved), label = "Apis cerana / Asian Honey Bee".
export const HIVE_SPECIES_OPTIONS = HIVE_SPECIES_GROUPS.flatMap((g) =>
	g.species.map((sp) => ({
		label: speciesLabel(sp),
		value: sp,
		group: g.group,
	})),
);