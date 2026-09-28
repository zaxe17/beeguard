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
	"Apis cerana": "Asian Honey Bee",
	"Apis mellifera": "Western Honey Bee",
	"Apis dorsata": "Giant Honey Bee",
	"Tetragonula biroi": "Philippine Stingless Bee",
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
export const HIVE_SPECIES = [
	"Apis cerana",
	"Apis mellifera",
	"Tetragonula biroi",
] as const;

/** "Apis cerana" -> "Apis cerana / Asian Honey Bee". */
export const speciesLabel = (species: string | null | undefined): string => {
	if (!species || species === "Unidentified") return "Unidentified";
	// Already "Scientific / English" (e.g. older dummy data) — keep as-is.
	if (species.includes("/")) return species;
	const scientific = formatScientific(species);
	const english = SPECIES_ENGLISH_NAMES[scientific];
	return english ? `${scientific} / ${english}` : scientific;
};

// Dropdown options for HIVE_SPECIES: value = scientific name (what's
// saved), label = "Apis cerana / Asian Honey Bee".
export const HIVE_SPECIES_OPTIONS = HIVE_SPECIES.map((sp) => ({
	label: speciesLabel(sp),
	value: sp,
}));