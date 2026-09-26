import type { MessierObject, MessierType } from "../../lib/messier/types";
import type { Star } from "../../lib/star-catalog/types";

/** IAU abbreviations of Ptolemy's 48, with Argo Navis as Carina, Puppis and Vela. */
export declare const CLASSICAL_CONSTELLATIONS: ReadonlySet<string>;
export declare const STYLE_EXAMPLE_SLUGS: string[];

export type StorySection = "Mythology" | "History";
export type Hemisphere = "northern" | "southern" | "both";
export type Season = "winter" | "spring" | "summer" | "autumn";

export interface StarFact {
  /** What the star popup titles it: proper name, else Bayer, else "HR n". */
  designation: string;
  name: string | null;
  /** Full Bayer designation, e.g. "β Orionis". */
  bayer: string | null;
  mag: number;
  distLy: number | null;
  colorK: number | null;
}

export interface MessierFact {
  id: string;
  name: string | null;
  type: MessierType;
  mag: number;
}

export interface LessonFacts {
  abbr: string;
  name: string;
  slug: string;
  genitive: string;
  storySection: StorySection;
  /** The brightest members, brightest first. */
  stars: StarFact[];
  /** Fainter members that have a proper name. */
  otherNamedStars: StarFact[];
  messier: MessierFact[];
  /** Mean position of the member stars; null when the catalog lists none. */
  centre: { raHours: number; decDeg: number } | null;
  hemisphere: Hemisphere | null;
  /** The month the centre is on the meridian at about 9 pm. */
  season: { month: string; northern: Season; southern: Season } | null;
}

export declare function buildLessonFacts(
  abbr: string,
  stars: readonly Star[],
  messier: readonly MessierObject[]
): LessonFacts;

export declare function formatLessonFacts(facts: LessonFacts): string;

export interface StyleExample {
  slug: string;
  mdx: string;
}

/** One entry in a Message Batches `requests` array. */
export interface LessonRequest {
  custom_id: string;
  params: {
    model: string;
    max_tokens: number;
    thinking: { type: "adaptive" };
    output_config: { effort: "medium" };
    system: Array<{
      type: "text";
      text: string;
      cache_control: { type: "ephemeral"; ttl: "1h" };
    }>;
    messages: Array<{ role: "user"; content: string }>;
  };
}

export declare function buildLessonRequest(
  facts: LessonFacts,
  examples: readonly StyleExample[]
): LessonRequest;

export interface LessonDraftCheck {
  /** "rejected" on any structural problem; "flagged" on untraceable facts. */
  verdict: "clean" | "flagged" | "rejected";
  rejections: string[];
  flags: string[];
}

export declare function checkLessonDraft(mdx: string, facts: LessonFacts): LessonDraftCheck;
