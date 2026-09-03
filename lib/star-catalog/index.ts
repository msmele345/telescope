export type { Star } from "./types";
export { celestialToVec3 } from "./coords";
export type { Vec3 } from "./coords";
export { magnitudeToSize, magnitudeToBrightness } from "./magnitude";
export type { MagnitudeSizeOptions } from "./magnitude";
export { loadCatalog, DEFAULT_CATALOG_URL } from "./loader";
export {
  buildStarFieldAttributes,
  buildHorizonStarFieldAttributes,
} from "./geometry";
export type { StarFieldAttributes } from "./geometry";
export { searchStars } from "./search";
export type { StarSearchOptions } from "./search";
