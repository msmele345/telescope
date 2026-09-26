// Pure helpers for the lesson-drafting script: the fact sheet a draft is
// grounded in, the batch request that asks for it, and the checks a finished
// draft must pass. No I/O — unit-testable.

import { getConstellationByAbbr } from "../../lib/constellation/meta.ts";

// Ptolemy's 48 classical constellations, as today's IAU abbreviations. Argo
// Navis was later split into Carina, Puppis and Vela, so the 48 become 50.
// Crux and Coma Berenices are deliberately absent: their stars were known to
// Ptolemy, but as parts of Centaurus and Leo, not as constellations.
export const CLASSICAL_CONSTELLATIONS = new Set([
  "And", "Aqr", "Aql", "Ara", "Ari", "Aur", "Boo", "Cnc", "CMa", "CMi",
  "Cap", "Cas", "Cen", "Cep", "Cet", "CrA", "CrB", "Crv", "Crt", "Cyg",
  "Del", "Dra", "Equ", "Eri", "Gem", "Her", "Hya", "Leo", "Lep", "Lib",
  "Lup", "Lyr", "Oph", "Ori", "Peg", "Per", "Psc", "PsA", "Sge", "Sgr",
  "Sco", "Ser", "Tau", "Tri", "UMa", "UMi", "Vir",
  "Car", "Pup", "Vel", // Argo Navis
]);

// How many of the brightest members the fact sheet lists in full. Fainter
// members still appear when they have a proper name (Alcor, the Pleiades).
const BRIGHTEST_COUNT = 8;

export function buildLessonFacts(abbr, stars, messier) {
  const meta = getConstellationByAbbr(abbr);
  if (!meta) throw new Error(`Unknown constellation abbreviation: ${abbr}`);

  const members = stars
    .filter((s) => s.constellation === meta.abbr)
    .sort((a, b) => a.mag - b.mag);
  const brightest = members.slice(0, BRIGHTEST_COUNT);
  const otherNamed = members.slice(BRIGHTEST_COUNT).filter((s) => s.name);
  const centre = centreOf(members);

  return {
    abbr: meta.abbr,
    name: meta.name,
    slug: meta.slug,
    genitive: meta.genitive,
    storySection: CLASSICAL_CONSTELLATIONS.has(meta.abbr) ? "Mythology" : "History",
    stars: brightest.map((s) => starFact(s, meta.genitive)),
    otherNamedStars: otherNamed.map((s) => starFact(s, meta.genitive)),
    messier: messier
      .filter((o) => o.constellation === meta.abbr)
      .map((o) => ({ id: o.id, name: o.name, type: o.type, mag: o.mag })),
    centre,
    hemisphere: centre ? hemisphereOf(centre.decDeg) : null,
    season: centre ? seasonOf(centre.raHours) : null,
  };
}

// Designation follows the star popup: proper name, else Bayer, else HR number.
function starFact(star, genitive) {
  const bayer = star.bayer ? `${star.bayer} ${genitive}` : null;
  return {
    designation: star.name ?? bayer ?? `HR ${star.id}`,
    name: star.name ?? null,
    bayer,
    mag: star.mag,
    distLy: star.distLy ?? null,
    colorK: star.colorK ?? null,
  };
}

const RAD_TO_DEG = 180 / Math.PI;
const RAD_TO_HOURS = 12 / Math.PI;

// Constellations centred within this many degrees of the celestial equator
// are well placed from both hemispheres.
const EQUATORIAL_BAND_DEG = 15;

// The mean position of the member stars. Right ascension is averaged as an
// angle — summing unit vectors — so a constellation spanning 23h and 1h is
// centred near 0h rather than near 12h.
function centreOf(members) {
  if (members.length === 0) return null;
  let x = 0;
  let y = 0;
  let dec = 0;
  for (const s of members) {
    x += Math.cos(s.ra);
    y += Math.sin(s.ra);
    dec += s.dec;
  }
  const raHours = (Math.atan2(y, x) * RAD_TO_HOURS + 24) % 24;
  return { raHours, decDeg: (dec / members.length) * RAD_TO_DEG };
}

function hemisphereOf(decDeg) {
  if (decDeg >= EQUATORIAL_BAND_DEG) return "northern";
  if (decDeg <= -EQUATORIAL_BAND_DEG) return "southern";
  return "both";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const NORTHERN_SEASON = [
  "winter", "winter", "spring", "spring", "spring", "summer",
  "summer", "summer", "autumn", "autumn", "autumn", "winter",
];
const OPPOSITE_SEASON = { winter: "summer", spring: "autumn", summer: "winter", autumn: "spring" };

// The best month is the one in which the centre crosses the meridian at about
// 9 pm. At 9 pm the meridian sits 9 hours of right ascension east of the Sun,
// and the Sun's right ascension is 0h at the March equinox and advances
// through all 24 hours in a year.
const EVENING_HOURS_AFTER_SUNSET_MERIDIAN = 9;
const MARCH_EQUINOX = Date.UTC(2001, 2, 20);
const DAY_MS = 86_400_000;

function seasonOf(raHours) {
  const sunRaHours = (raHours - EVENING_HOURS_AFTER_SUNSET_MERIDIAN + 24) % 24;
  const days = (sunRaHours / 24) * 365.25;
  const monthIndex = new Date(MARCH_EQUINOX + days * DAY_MS).getUTCMonth();
  const northern = NORTHERN_SEASON[monthIndex];
  return { month: MONTHS[monthIndex], northern, southern: OPPOSITE_SEASON[northern] };
}

// ---------------------------------------------------------------------------
// Fact sheet as text, and the batch request that carries it.

const LESSON_MODEL = "claude-opus-5";
const LESSON_MAX_TOKENS = 8000;

// Three handwritten lessons chosen for variety: famous with rich mythology,
// northern and circumpolar, and faint and modest.
export const STYLE_EXAMPLE_SLUGS = ["orion", "ursa-minor", "libra"];

const HEMISPHERE_TEXT = {
  northern: "the Northern Hemisphere",
  southern: "the Southern Hemisphere",
  both: `both hemispheres (it lies within ${EQUATORIAL_BAND_DEG}° of the celestial equator)`,
};

/** Renders a fact sheet as the text a draft is grounded in. */
export function formatLessonFacts(facts) {
  const lines = [
    `Constellation: ${facts.name} (genitive ${facts.genitive}, abbreviation ${facts.abbr})`,
    `Story section: ${facts.storySection}`,
  ];
  if (facts.centre) {
    const { raHours, decDeg } = facts.centre;
    const sign = decDeg >= 0 ? "+" : "−";
    lines.push(
      `Centre: right ascension ${raHours.toFixed(1)}h, declination ${sign}${Math.abs(decDeg).toFixed(0)}°`,
      `Favoured hemisphere: ${HEMISPHERE_TEXT[facts.hemisphere]}`,
      `Best seen: evenings around ${facts.season.month} — ${facts.season.northern} in the ` +
        `Northern Hemisphere, ${facts.season.southern} in the Southern Hemisphere`
    );
  }
  lines.push("", "Brightest stars, brightest first:", ...facts.stars.map(formatStar));
  lines.push(
    "",
    facts.otherNamedStars.length > 0 ? "Other named stars:" : "Other named stars: none",
    ...facts.otherNamedStars.map(formatStar)
  );
  lines.push(
    "",
    facts.messier.length > 0 ? "Messier objects:" : "Messier objects: none",
    ...facts.messier.map(
      (o) => `- ${o.id}${o.name ? ` ${o.name}` : ""}: ${o.type.replace(/-/g, " ")}, magnitude ${o.mag.toFixed(1)}`
    )
  );
  return lines.join("\n");
}

// Numbers appear exactly as the star popup shows them.
function formatStar(s) {
  const label = s.name && s.bayer ? `${s.name} (${s.bayer})` : s.designation;
  const distance = s.distLy != null ? `${s.distLy.toFixed(0)} ly` : "distance unknown";
  const colour = s.colorK != null ? `colour temperature ${s.colorK} K` : "colour temperature unknown";
  return `- ${label}: magnitude ${s.mag.toFixed(2)}, ${distance}, ${colour}`;
}

const INSTRUCTIONS = `You write constellation lessons for Telescope, a web star map for curious beginners. Each lesson is a short page a visitor reads after clicking a constellation on the map. You will be given a fact sheet for one constellation; write its lesson.

Format — follow the example lessons exactly:
- Plain Markdown. No frontmatter, no title above the first section, no imports, components or HTML.
- Exactly four sections, each a \`##\` heading, in this order:
  1. An epithet naming the figure, such as \`## The Hunter\` or \`## The Scales\`, followed by a two- or three-sentence introduction.
  2. \`## Mythology\` or \`## History\` — whichever the fact sheet's "Story section" line says.
  3. \`## Notable stars\`, or \`## Notable stars and objects\` when it includes Messier objects. A bulleted list; each bullet opens with the star's or object's name in bold.
  4. \`## How to find it\`.
- About 35 lines, with prose wrapped at roughly 90 characters as in the examples. A faint constellation with little to say should be shorter than Orion, not padded.

Facts:
- Every distance and magnitude you give must come from the fact sheet. Round it if you like ("about 860 light-years"), but never state a distance or magnitude the fact sheet does not give. Where it gives none, describe the star without a number.
- Open each Notable stars bullet with a name from the fact sheet, spelled as it spells it. A star with no proper name goes by its Bayer designation written out ("Gamma Piscium"). An asterism or object that is not a single star may lead a bullet with "The" ("The Belt").
- Mention only the Messier objects on the fact sheet.
- Use the fact sheet's season and favoured hemisphere for when and where to look. You may use neighbouring constellations and their bright stars to guide the reader there.
- A Mythology section retells the classical myths attached to the figure. A History section says plainly where the name came from and who introduced it; it never invents a myth for a constellation that has none.

Reply with the lesson only — no preamble and no closing remarks.`;

/**
 * One Message Batches request for a constellation's lesson. Everything before
 * the fact sheet — instructions and style examples — is identical for every
 * constellation, so it can be cached across the batch.
 */
export function buildLessonRequest(facts, examples) {
  const exampleText = examples
    .map((e) => `<example_lesson slug="${e.slug}">\n${e.mdx.trim()}\n</example_lesson>`)
    .join("\n\n");
  return {
    custom_id: facts.slug,
    params: {
      model: LESSON_MODEL,
      max_tokens: LESSON_MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: `${INSTRUCTIONS}\n\nThe example lessons below were written by hand; match their tone, length and format.\n\n${exampleText}`,
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Write the lesson for ${facts.name}.\n\n<fact_sheet>\n${formatLessonFacts(facts)}\n</fact_sheet>`,
        },
      ],
    },
  };
}

// The handwritten lessons run 33–42 lines; this band is deliberately wide so
// that a short honest lesson passes and only a broken one is rejected.
const MIN_LESSON_LINES = 20;
const MAX_LESSON_LINES = 60;

const HEADING = /^##\s+(.+?)\s*$/;
const SECTION_ORDER = ["epithet", "story", "notable", "find"];
const SECTION_LABEL = {
  epithet: "an epithet heading (e.g. \"The Hunter\")",
  notable: "Notable stars",
  find: "How to find it",
};

/**
 * Checks a finished draft against its fact sheet. Structural problems reject
 * the draft; facts that cannot be traced to the fact sheet only flag it.
 */
export function checkLessonDraft(mdx, facts) {
  const rejections = structuralProblems(mdx, facts);
  const flags = factFlags(mdx, facts);
  const verdict = rejections.length > 0 ? "rejected" : flags.length > 0 ? "flagged" : "clean";
  return { verdict, rejections, flags };
}

function structuralProblems(mdx, facts) {
  const problems = [];
  const lines = mdx.trimEnd().split("\n");

  // The draft is written to disk as-is, so anything above the first section —
  // frontmatter, a "Here is the lesson" preamble, a title, an opening code
  // fence — would render on the page.
  const firstHeading = lines.findIndex((l) => HEADING.test(l));
  const preamble = lines.slice(0, firstHeading === -1 ? lines.length : firstHeading);
  if (mdx.trimStart().startsWith("---")) {
    problems.push("Has frontmatter; lessons carry none.");
  } else if (preamble.some((l) => l.trim() !== "")) {
    problems.push("Has text before the first section (a preamble, title or code fence).");
  }
  if (lines.some((l) => l.trimStart().startsWith("```"))) {
    problems.push("Contains a code fence.");
  }

  const sections = headingsOf(lines);
  const kinds = sections.map((s) => s.kind);

  const story = sections.find((s) => s.kind === "story");
  if (!story) {
    problems.push(`Missing the ${facts.storySection} section.`);
  } else if (story.heading.toLowerCase() !== facts.storySection.toLowerCase()) {
    problems.push(`Has a ${story.heading} section where the fact sheet calls for ${facts.storySection}.`);
  }
  for (const kind of SECTION_ORDER.filter((k) => k !== "story")) {
    if (!kinds.includes(kind)) problems.push(`Missing the ${SECTION_LABEL[kind]} section.`);
  }

  if (kinds.length > SECTION_ORDER.length) {
    problems.push(`Has ${kinds.length} sections; expected ${SECTION_ORDER.length}.`);
  } else if (
    SECTION_ORDER.every((k) => kinds.includes(k)) &&
    kinds.some((k, i) => k !== SECTION_ORDER[i])
  ) {
    problems.push(
      `Sections are out of order: expected epithet, ${facts.storySection}, Notable stars, How to find it.`
    );
  }

  if (lines.length < MIN_LESSON_LINES || lines.length > MAX_LESSON_LINES) {
    problems.push(
      `Is ${lines.length} lines long; expected roughly ${MIN_LESSON_LINES}–${MAX_LESSON_LINES}.`
    );
  }
  return problems;
}

// Every `##` heading and which of the four sections it is. The epithet is
// whichever section is none of the other three.
function headingsOf(lines) {
  return lines.flatMap((line) => {
    const match = HEADING.exec(line);
    return match ? [{ heading: match[1], kind: kindOf(match[1]) }] : [];
  });
}

function kindOf(heading) {
  const h = heading.toLowerCase();
  if (h === "mythology" || h === "history") return "story";
  if (/^notable stars\b/.test(h)) return "notable";
  if (h === "how to find it") return "find";
  return "epithet";
}

// A quoted distance matches when it is within 5% of a listed distance: that is
// the most two-significant-figure rounding can move a value ("about 860
// light-years", "some 1,300 light-years").
const DISTANCE_TOLERANCE = 0.05;
const SCALE = { thousand: 1e3, million: 1e6, billion: 1e9 };

const NUMBER = String.raw`\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?`;
const SIGNED = String.raw`[+\-−–]?\d+(?:\.\d+)?`;
const LIST_SEPARATOR = String.raw`\s*,\s*(?:and\s+)?|\s+(?:and|or|to)\s+|\s*[–-]\s*`;

// "860 light-years", "2.5 million light-years", "a 770-light-year trip".
const DISTANCE_PATTERN = new RegExp(
  String.raw`(${NUMBER})(?:\s+(thousand|million|billion))?(?:\s*|-)(?:light[- ]years?|ly)\b`,
  "gi"
);
// "magnitude 2.1", "magnitude of about +3.4", "magnitudes 9 and 10".
const MAGNITUDE_AFTER = new RegExp(
  String.raw`\bmag(?:nitude)?s?\.?\s+(?:of\s+)?(?:(?:about|around|roughly|nearly|just|only)\s+)?` +
    String.raw`(${SIGNED}(?:(?:${LIST_SEPARATOR})\d+(?:\.\d+)?)*)`,
  "gi"
);
// "a 3.9-magnitude star".
const MAGNITUDE_BEFORE = new RegExp(String.raw`(${SIGNED})[\s-]magnitude\b`, "gi");
const MESSIER_PATTERN = /\b(?:M\s?|Messier\s+)(\d{1,3})\b/g;
const BULLET = /^\s*[-*]\s+/;
const BULLET_LEAD = /^\s*[-*]\s+\*\*(.+?)\*\*/;

// Numbers are checked against the star or object they are quoted for where the
// draft makes that plain — a Notable stars bullet led by its name — and
// against the whole fact sheet everywhere else.
function factFlags(mdx, facts) {
  const starsByName = starLookup(facts);
  const objectsByName = messierLookup(facts);
  const allSubjects = [...allStars(facts), ...facts.messier];
  const flags = [];
  for (const scope of claimScopes(mdx)) {
    const names = scope.lead ? namesInLead(scope.lead) : [];
    const named = [];
    for (const name of names) {
      const key = normalizeName(name.replace(/^the\s+/i, ""));
      const found = [...(starsByName.get(key) ?? []), ...(objectsByName.get(key) ?? [])];
      if (found.length > 0) named.push(...found);
      else if (!isAsterism(name)) flags.push(`"${name}" is not named in the fact sheet.`);
    }
    const attributed = named.length > 0;
    const subjects = attributed ? named : allSubjects;
    const about = attributed ? ` for ${names.join(" and ")}` : "";

    for (const match of scope.text.matchAll(DISTANCE_PATTERN)) {
      const scale = match[2] ? SCALE[match[2].toLowerCase()] : 1;
      const quoted = Number(match[1].replace(/,/g, "")) * scale;
      if (!subjects.some((s) => distanceMatches(quoted, s.distLy))) {
        flags.push(`Distance "${match[0]}"${about} matches no distance in the fact sheet.`);
      }
    }
    for (const { value, phrase } of quotedMagnitudes(scope.text)) {
      if (!subjects.some((o) => magnitudeMatches(value, o.mag))) {
        flags.push(`Magnitude ${value} in "${phrase}"${about} matches no magnitude in the fact sheet.`);
      }
    }
  }

  const listed = new Set(facts.messier.map((o) => o.id));
  for (const match of mdx.matchAll(MESSIER_PATTERN)) {
    const id = `M${match[1]}`;
    if (!listed.has(id) && !isSpectralType(mdx, match)) {
      flags.push(`Messier object ${id} is not in the fact sheet.`);
    }
  }
  return flags;
}

// Each magnitude as written, sign included. In a list ("magnitudes 9–10") only
// the first number can carry a sign; a later dash is a separator.
function quotedMagnitudes(text) {
  const quoted = [];
  for (const match of text.matchAll(MAGNITUDE_AFTER)) {
    const [first, ...rest] = match[1].match(/[+\-−–]?\d+(?:\.\d+)?/g);
    for (const value of [first, ...rest.map((n) => n.replace(/^[+\-−–]/, ""))]) {
      quoted.push({ value, phrase: match[0] });
    }
  }
  for (const match of text.matchAll(MAGNITUDE_BEFORE)) {
    quoted.push({ value: match[1], phrase: match[0] });
  }
  return quoted;
}

// Red giants are spectral type M, so "type M1" or "an M2 Iab supergiant" is
// not a Messier id.
function isSpectralType(text, match) {
  if (match[0].startsWith("Messier")) return false;
  const before = text.slice(Math.max(0, match.index - 20), match.index);
  const after = text.slice(match.index + match[0].length);
  return /\b(?:type|class)\s+$/i.test(before) || /^(?:\.\d|\s?(?:I{1,3}|IV|V|Ia|Iab|Ib)\b)/.test(after);
}

// Messier objects carry no distance, so a distance quoted for one never matches.
function distanceMatches(quoted, distLy) {
  if (distLy == null) return false;
  return Math.abs(quoted - distLy) <= Math.max(0.5, distLy * DISTANCE_TOLERANCE);
}

// A quoted magnitude matches when it is a listed magnitude rounded to the
// number of decimals it is quoted with ("magnitude 2" for 2.06).
function magnitudeMatches(text, mag) {
  const normalized = text.replace(/^[−–]/, "-");
  const decimals = normalized.split(".")[1]?.length ?? 0;
  return Math.abs(Number(normalized) - mag) <= 0.5 * 10 ** -decimals + 1e-9;
}

// Splits a draft into the Notable stars bullets (each with its bold lead) and
// one scope holding everything else. A bullet runs until the next bullet, a
// blank line, or a heading.
function claimScopes(mdx) {
  const bullets = [];
  const rest = [];
  let inNotable = false;
  let bullet = null;
  for (const line of mdx.split("\n")) {
    const heading = HEADING.exec(line);
    if (heading) {
      inNotable = kindOf(heading[1]) === "notable";
      bullet = null;
      rest.push(line);
    } else if (inNotable && BULLET.test(line)) {
      bullet = { lead: BULLET_LEAD.exec(line)?.[1] ?? null, lines: [line] };
      bullets.push(bullet);
    } else if (bullet && line.trim() !== "") {
      bullet.lines.push(line);
    } else {
      bullet = null;
      rest.push(line);
    }
  }
  return [
    ...bullets.map((b) => ({ lead: b.lead, text: b.lines.join("\n") })),
    { lead: null, text: rest.join("\n") },
  ];
}

// Words that mark a bullet lead as an asterism or deep-sky object rather than
// a single star: "Orion's Belt", "Sword of Orion", "Trapezium".
const NOT_A_STAR = /\b(?:belt|sword|clusters?|nebula|galaxy|trapezium|asterism|dipper|sickle|teapot|square|keystone|cross|triangle|core|eyes|stream|arc|circlet|kids|kite|horns)\b/i;

// Star names are checked where a lesson makes its claims about them: the bold
// lead of each Notable stars bullet. Stars named in passing elsewhere —
// neighbours used for star-hopping, like Sirius from Orion's belt — are not
// checked.
function namesInLead(lead) {
  return lead
    .replace(/\(.*?\)/g, "")
    .split(/,|\s+and\s+|\s*&\s*|\//)
    .map((s) => s.trim())
    .filter(Boolean);
}

// A lead the fact sheet does not know is only a star-name claim when it reads
// like one: leads starting with "The" or naming an asterism are not.
function isAsterism(name) {
  return /^the\s/i.test(name) || NOT_A_STAR.test(name);
}

const GREEK_LETTER_NAMES = {
  α: "Alpha", β: "Beta", γ: "Gamma", δ: "Delta", ε: "Epsilon", ζ: "Zeta",
  η: "Eta", θ: "Theta", ι: "Iota", κ: "Kappa", λ: "Lambda", μ: "Mu",
  ν: "Nu", ξ: "Xi", ο: "Omicron", π: "Pi", ρ: "Rho", σ: "Sigma",
  τ: "Tau", υ: "Upsilon", φ: "Phi", χ: "Chi", ψ: "Psi", ω: "Omega",
};

// Every way a draft may name a fact-sheet star — proper name, Bayer letter
// ("η Orionis", "η Ori"), or Bayer letter spelled out ("Eta Orionis") — mapped
// to the stars it can mean. Some names cover several catalog rows (Castor).
function starLookup(facts) {
  const lookup = new Map();
  const add = (name, star) => {
    const key = normalizeName(name);
    if (!lookup.has(key)) lookup.set(key, []);
    if (!lookup.get(key).includes(star)) lookup.get(key).push(star);
  };
  for (const s of allStars(facts)) {
    add(s.designation, s);
    if (!s.bayer) continue;
    add(s.bayer, s);
    const letter = s.bayer.slice(0, s.bayer.indexOf(" ")).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, "");
    for (const spelling of [letter, GREEK_LETTER_NAMES[letter]]) {
      if (!spelling) continue;
      add(`${spelling} ${facts.genitive}`, s);
      add(`${spelling} ${facts.abbr}`, s);
    }
  }
  return lookup;
}

// Messier objects by id ("M42"), id written out ("Messier 42"), and name.
function messierLookup(facts) {
  const lookup = new Map();
  for (const o of facts.messier) {
    for (const name of [o.id, o.id.replace(/^M/, "Messier "), o.name]) {
      if (name) lookup.set(normalizeName(name), [o]);
    }
  }
  return lookup;
}

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function allStars(facts) {
  return [...facts.stars, ...facts.otherNamedStars];
}
