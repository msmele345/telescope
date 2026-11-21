import type { Tour } from "@/lib/tours/types";

const tour: Tour = {
  slug: "arc-to-arcturus",
  title: "Arc to Arcturus",
  summary:
    "Follow the curved handle of the Big Dipper across the spring sky to orange Arcturus, Boötes, and blue-white Spica.",
  window: { from: { month: 3, day: 1 }, to: { month: 6, day: 30 } },
  stops: [
    {
      kind: "constellation",
      id: "UMa",
      heading: "Ursa Major, the Great Bear",
      body: "Look high in the northern sky on a spring evening for the seven bright stars of the **Big Dipper**, the familiar ladle hanging inside Ursa Major. In Greek myth the Great Bear is Callisto, swept into the heavens by Zeus alongside her son Arcas as Ursa Minor. Its two outer bowl stars, Dubhe and Merak, point straight to Polaris, while its curved handle launches the rest of this tour.",
    },
    {
      kind: "star",
      id: 5340,
      heading: "Arcturus",
      body: "Follow the curve of the Big Dipper's handle outward away from the bowl — the old mnemonic **\"arc to Arcturus\"** — until you reach the first brilliant orange star. At magnitude −0.04, Arcturus is the brightest star north of the celestial equator, shining with a warm butterscotch colour from just 37 light-years away. Its name means \"guardian of the bear,\" for the way it follows Ursa Major around the pole night after night.",
    },
    {
      kind: "constellation",
      id: "Boo",
      heading: "Boötes, the Herdsman",
      body: "With Arcturus anchoring the bottom point, look northward from it to trace a tall, narrow kite rising into the spring sky — that is Boötes. Stars like Izar partway up one side, Seginus at the shoulder, and Nekkar at the top outline the herdsman's body. The Greeks saw him either as Arcas watching over his mother the Great Bear, or as a ploughman driving the oxen of the Big Dipper around the pole.",
    },
    {
      kind: "star",
      id: 5056,
      heading: "Spica",
      body: "Drop back down through Arcturus and keep going southward along the same sweeping curve — **\"speed on to Spica\"** — until a crisp blue-white star stands out in a quieter stretch of sky. Spica shines at magnitude 0.98 from 262 light-years away, the only first-magnitude star in Virgo. It is a close binary whose two stars orbit so tightly they have pulled each other into egg shapes.",
    },
    {
      kind: "constellation",
      id: "Vir",
      heading: "Virgo, the Maiden",
      body: "From Spica, look northwest across the fainter stars spreading out around it to trace Virgo, the second-largest constellation in the sky. In Greek myth she is most often Demeter, goddess of grain, holding a sheaf of wheat marked by Spica — whose name means \"ear of wheat.\" Other traditions see her as Astraea, goddess of justice, standing beside the scales of neighbouring Libra.",
    },
  ],
};

export default tour;
