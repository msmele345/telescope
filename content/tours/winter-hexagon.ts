import type { Tour } from "@/lib/tours/types";

const tour: Tour = {
  slug: "winter-hexagon",
  title: "Winter Hexagon",
  summary:
    "Follow Orion's Belt through the brightest landmarks of the winter sky, from the Orion Nebula and the Pleiades to Sirius.",
  window: { from: { month: 12, day: 1 }, to: { month: 3, day: 31 } },
  stops: [
    {
      kind: "constellation",
      id: "Ori",
      heading: "Orion, the Hunter",
      body: "Look south on a winter evening for three bright stars in a short, straight row — Orion's **Belt**, the easiest starting point in the winter sky. Once you spot the Belt, the giant hunter falls into place around it, with orange Betelgeuse at his shoulder and blue-white Rigel at his foot. In Greek myth Orion was placed opposite his old foe Scorpius, so he sinks in the west as the scorpion rises in the east.",
    },
    {
      kind: "star",
      id: 2061,
      heading: "Betelgeuse",
      body: "From the Belt, step up and to the northeast to the bright orange star marking Orion's right shoulder. Betelgeuse shines at magnitude 0.50 from 640 light-years away, a red supergiant near the end of its life. Placed where the Sun sits, it would swallow the orbit of Jupiter.",
    },
    {
      kind: "messier",
      id: "M42",
      heading: "The Orion Nebula",
      body: "Drop back south from Betelgeuse past the Belt to the short vertical line of stars hanging beneath it — Orion's sword. Its middle \"star\" is a fuzzy patch, the Orion Nebula (M42), glowing at magnitude 4.0 and visible to the unaided eye under dark skies. It is a cloud of gas where new stars are forming, and even binoculars turn the smudge into a misty bloom.",
    },
    {
      kind: "constellation",
      id: "Tau",
      heading: "Taurus, the Bull",
      body: "Return to Orion's Belt and follow its line northwest — up and to the right from northern latitudes — to reach the charging head of Taurus. A V-shaped open cluster called the Hyades outlines the bull's face, with two long horns stretching back toward Orion. In Greek myth Taurus is Zeus disguised as a white bull to carry the princess Europa across the sea to Crete.",
    },
    {
      kind: "star",
      id: 1457,
      heading: "Aldebaran",
      body: "At the eastern tip of the V of the Hyades sits the bull's glowing red eye, the first bright orange star you meet along the line from Orion's Belt. Aldebaran is an aging orange giant shining at magnitude 0.85 from 65 light-years away, much closer to us than the Hyades behind it. Its warm orange colour is the surest way to confirm you are looking at Taurus.",
    },
    {
      kind: "messier",
      id: "M45",
      heading: "The Pleiades",
      body: "Continue northwest past Aldebaran along the same line from Orion's Belt until a tight, glittering knot of blue stars catches your eye on the bull's shoulder. The Pleiades (M45), also called the Seven Sisters, shine together at magnitude 1.6 as a cluster of young blue stars. The naked eye resolves six or seven; binoculars reveal hundreds.",
    },
    {
      kind: "star",
      id: 2491,
      heading: "Sirius",
      body: "Now retrace that line all the way back southeast through Aldebaran and across Orion's Belt, continuing past the Belt to the far side until it strikes a dazzling blue-white beacon in Canis Major. Sirius, the Dog Star, is the brightest star in the night sky at magnitude −1.46, owing much of its brilliance to lying just 8.6 light-years away — one of the Sun's nearest neighbours. To the Greeks its dawn rising marked the hottest \"dog days\" of summer, while in ancient Egypt it announced the annual flooding of the Nile.",
    },
  ],
};

export default tour;
