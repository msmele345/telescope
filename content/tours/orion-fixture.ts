import type { Tour } from "@/lib/tours/types";

// A small fixture so the tour content test has something real to run against.
// Ticket 5 replaces it with the four launch tours.
const tour: Tour = {
  slug: "orion-fixture",
  title: "Around Orion",
  summary: "A short hop around the Hunter, the easiest winter constellation to find.",
  window: { from: { month: 12, day: 1 }, to: { month: 3, day: 31 } },
  stops: [
    {
      kind: "constellation",
      id: "Ori",
      heading: "Orion, the Hunter",
      body: "Look for three bright stars in a short, straight row. That is Orion's **Belt**, and the rest of the Hunter is drawn around it.",
    },
    {
      kind: "star",
      id: 2061,
      heading: "Betelgeuse",
      body: "Orion's shoulder glows orange. Betelgeuse is a red supergiant, so large that it would swallow the orbit of Mars if it sat where the Sun is.",
    },
    {
      kind: "star",
      id: 1790,
      heading: "Bellatrix",
      body: "Across from Betelgeuse is the Hunter's other shoulder. Bellatrix is a hot blue-white star, which is easy to see next to its orange neighbour.",
    },
    {
      kind: "star",
      id: 1713,
      heading: "Rigel",
      body: "Below the Belt, at Orion's knee, sits blue-white Rigel. It is usually the brightest star in the constellation.",
    },
    {
      kind: "messier",
      id: "M42",
      heading: "The Orion Nebula",
      body: "Below the Belt hangs a short line of stars, the Sword. Its middle \"star\" is a fuzzy patch, the Orion Nebula. It is a cloud of gas where new stars are forming, about 1,300 light-years away.",
    },
  ],
};

export default tour;
