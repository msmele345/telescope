export interface Star {
  id: number;
  ra: number;
  dec: number;
  mag: number;
  name?: string;
  bayer?: string;
  constellation?: string;
  colorK?: number;
  /** Distance in light-years, derived from Hipparcos/BSC parallax. */
  distLy?: number;
}
