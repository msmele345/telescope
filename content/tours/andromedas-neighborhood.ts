import type { Tour } from "@/lib/tours/types";

const tour: Tour = {
  slug: "andromedas-neighborhood",
  title: "Andromeda's Neighborhood",
  summary:
    "Hop from the Great Square of Pegasus through the royal family of autumn — Andromeda, her galaxy, Cassiopeia, and Perseus.",
  window: { from: { month: 9, day: 1 }, to: { month: 12, day: 31 } },
  stops: [
    {
      kind: "constellation",
      id: "Peg",
      heading: "Pegasus, the Winged Horse",
      body: "Look high in the south on an autumn evening for four stars of similar brightness forming an enormous, nearly empty box — the **Great Square of Pegasus**. Markab, Scheat, and Algenib mark three of its corners, with the horse's neck bending southwest toward orange Enif. In Greek myth Pegasus sprang from the blood of Medusa and flew on to the stables of Olympus after throwing Bellerophon from his back.",
    },
    {
      kind: "constellation",
      id: "And",
      heading: "Andromeda, the Chained Lady",
      body: "Find Alpheratz at the northeastern corner of the Great Square, and follow the two long chains of stars trailing northeast from it through Mirach and Almach — that is Andromeda. Alpheratz doubles as the princess's head and was once counted in both constellations. In Greek myth Andromeda was chained to a rock by the sea to appease the monster Cetus after her mother Cassiopeia boasted of her beauty.",
    },
    {
      kind: "messier",
      id: "M31",
      heading: "The Andromeda Galaxy",
      body: "Go to Mirach, the reddish giant midway along Andromeda's chain, and step northwest past two fainter stars — just beyond the second sits a soft oval glow. That smudge is the Andromeda Galaxy (M31), a spiral galaxy of a trillion stars shining at magnitude 3.4 and the nearest large galaxy to our own. From a dark site you can see it with the unaided eye; look slightly to one side using averted vision and it brightens noticeably.",
    },
    {
      kind: "constellation",
      id: "Cas",
      heading: "Cassiopeia, the Queen",
      body: "From the Andromeda Galaxy, keep moving north across the sky until five bright stars form a crooked **W** (or M, depending on the hour) high above her daughter. That is Queen Cassiopeia, led by Schedar and Caph, sitting opposite the Big Dipper across Polaris so it never sets from most northern latitudes. As punishment for her boast against the sea nymphs, she was fixed to her chair to wheel upside down around the pole.",
    },
    {
      kind: "constellation",
      id: "Per",
      heading: "Perseus, the Hero",
      body: "Follow the eastern stars of Cassiopeia's W down and to the southeast into the Milky Way, where a sweeping arc of stars curves out from yellow-white Mirfak — that is Perseus, flying beside Andromeda. In Greek myth Perseus slew Medusa by watching her reflection in his shield, rescued Andromeda from Cetus, and married her, placing the whole royal cast side by side in the sky. Just south of Mirfak sits Algol, the Gorgon's head, a famous eclipsing star that noticeably dims and brightens again every 2.9 days.",
    },
  ],
};

export default tour;
