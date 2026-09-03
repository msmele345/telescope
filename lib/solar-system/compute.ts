import * as Astronomy from "astronomy-engine";
import type { ObserverLocation } from "@/lib/observer";
import type { SolarBody, SolarBodyId, SolarBodyKind } from "./types";

const HOURS_TO_RAD = Math.PI / 12;
const DEG_TO_RAD = Math.PI / 180;

interface BodyDef {
  id: SolarBodyId;
  name: string;
  kind: SolarBodyKind;
  body: Astronomy.Body;
}

const BODIES: ReadonlyArray<BodyDef> = [
  { id: "sun", name: "Sun", kind: "sun", body: Astronomy.Body.Sun },
  { id: "moon", name: "Moon", kind: "moon", body: Astronomy.Body.Moon },
  { id: "mercury", name: "Mercury", kind: "planet", body: Astronomy.Body.Mercury },
  { id: "venus", name: "Venus", kind: "planet", body: Astronomy.Body.Venus },
  { id: "mars", name: "Mars", kind: "planet", body: Astronomy.Body.Mars },
  { id: "jupiter", name: "Jupiter", kind: "planet", body: Astronomy.Body.Jupiter },
  { id: "saturn", name: "Saturn", kind: "planet", body: Astronomy.Body.Saturn },
  { id: "uranus", name: "Uranus", kind: "planet", body: Astronomy.Body.Uranus },
  { id: "neptune", name: "Neptune", kind: "planet", body: Astronomy.Body.Neptune },
];

export const SOLAR_BODY_IDS: ReadonlyArray<SolarBodyId> = BODIES.map((b) => b.id);

/**
 * Compute apparent equatorial position + magnitude for the Sun, Moon, and
 * 8 planets at a given observer/time. Coordinates are observer-topocentric
 * and "of-date" (precession + nutation + aberration applied), so they feed
 * directly into the existing equatorialToHorizontal pipeline.
 */
export function computeSolarBodies(
  observer: ObserverLocation,
  when: Date
): SolarBody[] {
  const obs = new Astronomy.Observer(observer.lat, observer.lng, 0);
  return BODIES.map(({ id, name, kind, body }) => {
    const eq = Astronomy.Equator(body, when, obs, true, true);
    const mag = magnitudeFor(body, when);
    return {
      id,
      name,
      kind,
      ra: eq.ra * HOURS_TO_RAD,
      dec: eq.dec * DEG_TO_RAD,
      mag,
      distAU: eq.dist,
    };
  });
}

function magnitudeFor(body: Astronomy.Body, when: Date): number {
  // Astronomy.Illumination handles Sun, Moon, and the planets directly.
  try {
    return Astronomy.Illumination(body, when).mag;
  } catch {
    // Defensive: if Illumination ever rejects an input, fall back to a
    // typical magnitude rather than crashing the render.
    return 0;
  }
}
