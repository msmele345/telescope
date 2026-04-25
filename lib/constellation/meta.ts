// IAU 88 constellation metadata. Static — these don't change.
// Keyed by the IAU 3-letter abbreviation used in the BSC catalog and the
// d3-celestial line data.

export interface ConstellationMeta {
  /** IAU 3-letter abbreviation, e.g. "Ori". */
  abbr: string;
  /** Display name, e.g. "Orion". */
  name: string;
  /** URL slug, e.g. "orion". */
  slug: string;
  /** Genitive form (Latin possessive used in star names), e.g. "Orionis". */
  genitive: string;
}

const ENTRIES: ReadonlyArray<readonly [string, string, string]> = [
  ["And", "Andromeda", "Andromedae"],
  ["Ant", "Antlia", "Antliae"],
  ["Aps", "Apus", "Apodis"],
  ["Aql", "Aquila", "Aquilae"],
  ["Aqr", "Aquarius", "Aquarii"],
  ["Ara", "Ara", "Arae"],
  ["Ari", "Aries", "Arietis"],
  ["Aur", "Auriga", "Aurigae"],
  ["Boo", "Boötes", "Boötis"],
  ["CMa", "Canis Major", "Canis Majoris"],
  ["CMi", "Canis Minor", "Canis Minoris"],
  ["CVn", "Canes Venatici", "Canum Venaticorum"],
  ["Cae", "Caelum", "Caeli"],
  ["Cam", "Camelopardalis", "Camelopardalis"],
  ["Cap", "Capricornus", "Capricorni"],
  ["Car", "Carina", "Carinae"],
  ["Cas", "Cassiopeia", "Cassiopeiae"],
  ["Cen", "Centaurus", "Centauri"],
  ["Cep", "Cepheus", "Cephei"],
  ["Cet", "Cetus", "Ceti"],
  ["Cha", "Chamaeleon", "Chamaeleontis"],
  ["Cir", "Circinus", "Circini"],
  ["Cnc", "Cancer", "Cancri"],
  ["Col", "Columba", "Columbae"],
  ["Com", "Coma Berenices", "Comae Berenices"],
  ["CrA", "Corona Australis", "Coronae Australis"],
  ["CrB", "Corona Borealis", "Coronae Borealis"],
  ["Crt", "Crater", "Crateris"],
  ["Cru", "Crux", "Crucis"],
  ["Crv", "Corvus", "Corvi"],
  ["Cyg", "Cygnus", "Cygni"],
  ["Del", "Delphinus", "Delphini"],
  ["Dor", "Dorado", "Doradus"],
  ["Dra", "Draco", "Draconis"],
  ["Equ", "Equuleus", "Equulei"],
  ["Eri", "Eridanus", "Eridani"],
  ["For", "Fornax", "Fornacis"],
  ["Gem", "Gemini", "Geminorum"],
  ["Gru", "Grus", "Gruis"],
  ["Her", "Hercules", "Herculis"],
  ["Hor", "Horologium", "Horologii"],
  ["Hya", "Hydra", "Hydrae"],
  ["Hyi", "Hydrus", "Hydri"],
  ["Ind", "Indus", "Indi"],
  ["LMi", "Leo Minor", "Leonis Minoris"],
  ["Lac", "Lacerta", "Lacertae"],
  ["Leo", "Leo", "Leonis"],
  ["Lep", "Lepus", "Leporis"],
  ["Lib", "Libra", "Librae"],
  ["Lup", "Lupus", "Lupi"],
  ["Lyn", "Lynx", "Lyncis"],
  ["Lyr", "Lyra", "Lyrae"],
  ["Men", "Mensa", "Mensae"],
  ["Mic", "Microscopium", "Microscopii"],
  ["Mon", "Monoceros", "Monocerotis"],
  ["Mus", "Musca", "Muscae"],
  ["Nor", "Norma", "Normae"],
  ["Oct", "Octans", "Octantis"],
  ["Oph", "Ophiuchus", "Ophiuchi"],
  ["Ori", "Orion", "Orionis"],
  ["Pav", "Pavo", "Pavonis"],
  ["Peg", "Pegasus", "Pegasi"],
  ["Per", "Perseus", "Persei"],
  ["Phe", "Phoenix", "Phoenicis"],
  ["Pic", "Pictor", "Pictoris"],
  ["PsA", "Piscis Austrinus", "Piscis Austrini"],
  ["Psc", "Pisces", "Piscium"],
  ["Pup", "Puppis", "Puppis"],
  ["Pyx", "Pyxis", "Pyxidis"],
  ["Ret", "Reticulum", "Reticuli"],
  ["Scl", "Sculptor", "Sculptoris"],
  ["Sco", "Scorpius", "Scorpii"],
  ["Sct", "Scutum", "Scuti"],
  ["Ser", "Serpens", "Serpentis"],
  ["Sex", "Sextans", "Sextantis"],
  ["Sge", "Sagitta", "Sagittae"],
  ["Sgr", "Sagittarius", "Sagittarii"],
  ["Tau", "Taurus", "Tauri"],
  ["Tel", "Telescopium", "Telescopii"],
  ["TrA", "Triangulum Australe", "Trianguli Australis"],
  ["Tri", "Triangulum", "Trianguli"],
  ["Tuc", "Tucana", "Tucanae"],
  ["UMa", "Ursa Major", "Ursae Majoris"],
  ["UMi", "Ursa Minor", "Ursae Minoris"],
  ["Vel", "Vela", "Velorum"],
  ["Vir", "Virgo", "Virginis"],
  ["Vol", "Volans", "Volantis"],
  ["Vul", "Vulpecula", "Vulpeculae"],
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-");
}

export const CONSTELLATIONS: ReadonlyArray<ConstellationMeta> = ENTRIES.map(
  ([abbr, name, genitive]) => ({
    abbr,
    name,
    slug: toSlug(name),
    genitive,
  })
);

const BY_ABBR = new Map<string, ConstellationMeta>(
  CONSTELLATIONS.map((c) => [c.abbr, c])
);
const BY_SLUG = new Map<string, ConstellationMeta>(
  CONSTELLATIONS.map((c) => [c.slug, c])
);

export function getConstellationByAbbr(
  abbr: string | undefined | null
): ConstellationMeta | null {
  if (!abbr) return null;
  return BY_ABBR.get(abbr) ?? null;
}

export function getConstellationBySlug(
  slug: string | undefined | null
): ConstellationMeta | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

export function isKnownAbbr(abbr: string): boolean {
  return BY_ABBR.has(abbr);
}
