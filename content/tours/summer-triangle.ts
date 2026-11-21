import type { Tour } from "@/lib/tours/types";

const tour: Tour = {
  slug: "summer-triangle",
  title: "Summer Triangle",
  summary:
    "Trace the three bright corner stars of summer — Vega, Deneb, and Altair — along the Milky Way, with a stop at the Ring Nebula.",
  window: { from: { month: 6, day: 1 }, to: { month: 9, day: 30 } },
  stops: [
    {
      kind: "constellation",
      id: "Lyr",
      heading: "Lyra, the Lyre",
      body: "Look high overhead on a summer evening for a piercing blue-white beacon with a small, slanted parallelogram of fainter stars hanging just below it — that is Lyra, the western corner of the **Summer Triangle**. In Greek myth this is the lyre of Orpheus, the musician whose playing softened even Hades in the underworld before his instrument was set among the stars. Compact as it is, Lyra is the cleanest starting landmark of the summer sky.",
    },
    {
      kind: "star",
      id: 7001,
      heading: "Vega",
      body: "At the top corner of Lyra sits Vega, the brightest star near the summer zenith and the anchor that just led you to the constellation. Vega shines at magnitude 0.03 from just 25 light-years away, and astronomers once used it as the reference point for the entire magnitude scale. Its name comes from an Arabic phrase meaning \"the falling eagle,\" a memory of older traditions that pictured Lyra as a swooping bird.",
    },
    {
      kind: "messier",
      id: "M57",
      heading: "The Ring Nebula",
      body: "From Vega, step southeast across Lyra's small parallelogram to its lower edge and aim almost halfway between the two bottom stars, Sheliak and Sulafat. Hidden there is the Ring Nebula (M57), the glowing shell of gas thrown off by a dying star. At magnitude 8.8 it needs a telescope, where it appears as a small grey smoke ring.",
    },
    {
      kind: "constellation",
      id: "Cyg",
      heading: "Cygnus, the Swan",
      body: "From Lyra's lower edge, sweep east into the bright band of the Milky Way until a huge cross of stars takes shape — the **Northern Cross**, which forms the body of Cygnus. The swan flies southward down the Milky Way with wide wings spread and the golden-and-blue double star Albireo at its beak. Greek myth tells of Zeus disguised as a swan, or of the grieving friend Cygnus diving into the river Eridanus in search of Phaethon.",
    },
    {
      kind: "star",
      id: 7924,
      heading: "Deneb",
      body: "Follow the long beam of the Northern Cross northward to its top star, marking the swan's tail and the northeastern corner of the Summer Triangle. Deneb — Arabic for \"tail\" — shines at magnitude 1.25 even though it lies 2,615 light-years away, more than a hundred times farther than Vega. To look so bright across that gulf, it must be one of the most luminous stars we can see.",
    },
    {
      kind: "constellation",
      id: "Aql",
      heading: "Aquila, the Eagle",
      body: "From Deneb, trace the shaft of the Northern Cross south-southwest past Albireo and continue down the Milky Way to reach Aquila, the southernmost corner of the Summer Triangle. The eagle flies northward along the glowing band of starlight, its wings spreading out from a tidy row of three stars at its neck. In Greek myth Aquila carried Zeus's thunderbolts and snatched the Trojan prince Ganymede up to Olympus.",
    },
    {
      kind: "star",
      id: 7557,
      heading: "Altair",
      body: "Right at the centre of Aquila's short line of three stars — closely flanked above by Tarazed and below by Alshain — shines Altair, completing the Summer Triangle. At magnitude 0.77 and just 17 light-years away, Altair is one of our nearest bright stars, spinning so quickly that it bulges into an oval. In Chinese astronomy Altair is the Herdboy separated by the river of the Milky Way from Vega, the Weaver Girl, allowed to cross and meet her only one night each year.",
    },
  ],
};

export default tour;
