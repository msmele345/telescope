# How Telescope Was Built

Next.js 14 (App Router) + react-three-fiber/three.js, Postgres, NextAuth (Google + magic link), on Vercel.

**Design:** the hard astronomy lives in pure, framework-agnostic, unit-tested modules — `sky-math` (RA/Dec→Alt/Az via sidereal time + precession), `time-controller`, `zip-geocoder` — so the r3f scene stays a thin renderer. The camera sits at the sphere's center; 9k Yale BSC stars project onto the inside of the dome, sized by magnitude.

**Hard parts:** holding 60fps at 9k stars (instanced points, per-tick not per-frame position recompute); `astronomy-engine` for live Sun/Moon/planet ephemerides; a Hipparcos parallax cross-match (joined by HD id, negative-parallax filtered) that lifted distance coverage from 34%→99%.
