export interface Star {
  id: number;
  ra: number;
  dec: number;
  mag: number;
  name?: string;
  bayer?: string;
  constellation?: string;
  colorK?: number;
}
