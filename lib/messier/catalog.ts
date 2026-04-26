import type { MessierObject, MessierType } from "./types";

const HOURS_TO_RAD = Math.PI / 12;
const DEG_TO_RAD = Math.PI / 180;

// Curated subset of the 110 Messier deep-sky objects, biased toward the
// most observable / culturally famous: Andromeda, Orion Nebula, Pleiades,
// Whirlpool, Ring Nebula, Hercules cluster, etc. Coordinates are J2000.
// [m, common name, type, RA(hours), Dec(degrees), V mag, constellation]
type Entry = readonly [
  number,
  string | null,
  MessierType,
  number,
  number,
  number,
  string,
];

const ENTRIES: ReadonlyArray<Entry> = [
  [1, "Crab Nebula", "supernova-remnant", 5.5753, 22.0144, 8.4, "Tau"],
  [2, null, "globular-cluster", 21.5575, -0.8233, 6.5, "Aqr"],
  [3, null, "globular-cluster", 13.7031, 28.3772, 6.2, "CVn"],
  [4, null, "globular-cluster", 16.3931, -26.5253, 5.6, "Sco"],
  [5, null, "globular-cluster", 15.3092, 2.0808, 5.6, "Ser"],
  [6, "Butterfly Cluster", "open-cluster", 17.6683, -32.2031, 4.2, "Sco"],
  [7, "Ptolemy Cluster", "open-cluster", 17.8975, -34.7931, 3.3, "Sco"],
  [8, "Lagoon Nebula", "nebula", 18.0603, -24.3867, 6.0, "Sgr"],
  [11, "Wild Duck Cluster", "open-cluster", 18.8514, -6.27, 6.3, "Sct"],
  [13, "Hercules Globular Cluster", "globular-cluster", 16.6947, 36.4597, 5.8, "Her"],
  [15, null, "globular-cluster", 21.4994, 12.1669, 6.2, "Peg"],
  [16, "Eagle Nebula", "nebula", 18.3133, -13.8167, 6.0, "Ser"],
  [17, "Omega Nebula", "nebula", 18.3406, -16.1767, 6.0, "Sgr"],
  [20, "Trifid Nebula", "nebula", 18.0397, -23.03, 6.3, "Sgr"],
  [22, "Sagittarius Cluster", "globular-cluster", 18.6067, -23.9033, 5.1, "Sgr"],
  [27, "Dumbbell Nebula", "planetary-nebula", 19.9933, 22.7211, 7.5, "Vul"],
  [31, "Andromeda Galaxy", "galaxy", 0.7122, 41.2692, 3.4, "And"],
  [32, null, "galaxy", 0.7117, 40.8653, 8.1, "And"],
  [33, "Triangulum Galaxy", "galaxy", 1.5639, 30.66, 5.7, "Tri"],
  [35, null, "open-cluster", 6.15, 24.35, 5.3, "Gem"],
  [36, null, "open-cluster", 5.6033, 34.14, 6.3, "Aur"],
  [37, null, "open-cluster", 5.8717, 32.5533, 6.2, "Aur"],
  [38, null, "open-cluster", 5.4783, 35.855, 7.4, "Aur"],
  [42, "Orion Nebula", "nebula", 5.5881, -5.3911, 4.0, "Ori"],
  [43, "De Mairan's Nebula", "nebula", 5.5919, -5.27, 9.0, "Ori"],
  [44, "Beehive Cluster", "open-cluster", 8.6733, 19.6667, 3.7, "Cnc"],
  [45, "Pleiades", "open-cluster", 3.79, 24.1167, 1.6, "Tau"],
  [46, null, "open-cluster", 7.6961, -14.81, 6.1, "Pup"],
  [47, null, "open-cluster", 7.61, -14.5, 4.4, "Pup"],
  [51, "Whirlpool Galaxy", "galaxy", 13.4981, 47.1953, 8.4, "CVn"],
  [57, "Ring Nebula", "planetary-nebula", 18.8931, 33.0292, 8.8, "Lyr"],
  [63, "Sunflower Galaxy", "galaxy", 13.2636, 42.0292, 8.6, "CVn"],
  [64, "Black Eye Galaxy", "galaxy", 12.9456, 21.6828, 8.5, "Com"],
  [65, null, "galaxy", 11.3156, 13.0922, 9.3, "Leo"],
  [66, null, "galaxy", 11.3375, 12.9917, 8.9, "Leo"],
  [67, null, "open-cluster", 8.84, 11.8167, 6.1, "Cnc"],
  [74, null, "galaxy", 1.6117, 15.7833, 9.4, "Psc"],
  [81, "Bode's Galaxy", "galaxy", 9.9258, 69.0653, 6.9, "UMa"],
  [82, "Cigar Galaxy", "galaxy", 9.9311, 69.6797, 8.4, "UMa"],
  [87, "Virgo A", "galaxy", 12.5136, 12.3911, 8.6, "Vir"],
  [97, "Owl Nebula", "planetary-nebula", 11.2467, 55.0192, 9.9, "UMa"],
  [101, "Pinwheel Galaxy", "galaxy", 14.0533, 54.3489, 7.9, "UMa"],
  [104, "Sombrero Galaxy", "galaxy", 12.6664, -11.6231, 8.0, "Vir"],
  [108, null, "galaxy", 11.1919, 55.6742, 10.0, "UMa"],
  [110, null, "galaxy", 0.6728, 41.6853, 8.5, "And"],
];

export const MESSIER_CATALOG: ReadonlyArray<MessierObject> = ENTRIES.map(
  ([m, name, type, raH, decDeg, mag, constellation]) => ({
    m,
    id: `M${m}`,
    name,
    type,
    ra: raH * HOURS_TO_RAD,
    dec: decDeg * DEG_TO_RAD,
    mag,
    constellation,
  })
);

const BY_ID = new Map<string, MessierObject>(
  MESSIER_CATALOG.map((o) => [o.id, o])
);

export function getMessierById(id: string): MessierObject | null {
  return BY_ID.get(id) ?? null;
}
