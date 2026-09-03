export { toJulianDate, julianCenturiesSinceJ2000, J2000_JD } from "./julian";
export { greenwichMeanSiderealTime, localSiderealTime } from "./sidereal";
export { equatorialToHorizontal, horizontalToVec3 } from "./horizontal";
export type { Horizontal } from "./horizontal";
export { galacticToEquatorial } from "./galactic";
export type { Equatorial } from "./galactic";

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
