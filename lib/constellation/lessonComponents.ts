import type { ComponentType } from "react";

import Aquarius from "@/content/constellations/aquarius.mdx";
import Aries from "@/content/constellations/aries.mdx";
import Cancer from "@/content/constellations/cancer.mdx";
import Capricornus from "@/content/constellations/capricornus.mdx";
import Gemini from "@/content/constellations/gemini.mdx";
import Leo from "@/content/constellations/leo.mdx";
import Libra from "@/content/constellations/libra.mdx";
import Orion from "@/content/constellations/orion.mdx";
import Pisces from "@/content/constellations/pisces.mdx";
import Sagittarius from "@/content/constellations/sagittarius.mdx";
import Scorpius from "@/content/constellations/scorpius.mdx";
import Taurus from "@/content/constellations/taurus.mdx";
import UrsaMajor from "@/content/constellations/ursa-major.mdx";
import UrsaMinor from "@/content/constellations/ursa-minor.mdx";
import Virgo from "@/content/constellations/virgo.mdx";

const LESSON_COMPONENTS: Record<string, ComponentType> = {
  aquarius: Aquarius,
  aries: Aries,
  cancer: Cancer,
  capricornus: Capricornus,
  gemini: Gemini,
  leo: Leo,
  libra: Libra,
  orion: Orion,
  pisces: Pisces,
  sagittarius: Sagittarius,
  scorpius: Scorpius,
  taurus: Taurus,
  "ursa-major": UrsaMajor,
  "ursa-minor": UrsaMinor,
  virgo: Virgo,
};

export function getLessonComponent(slug: string): ComponentType | null {
  return LESSON_COMPONENTS[slug] ?? null;
}
