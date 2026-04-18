export interface MagnitudeSizeOptions {
  minMag?: number;
  maxMag?: number;
  minSize?: number;
  maxSize?: number;
}

const DEFAULT_SIZE_OPTS: Required<MagnitudeSizeOptions> = {
  minMag: -1.5,
  maxMag: 6.5,
  minSize: 1.5,
  maxSize: 14.0,
};

export function magnitudeToSize(mag: number, opts: MagnitudeSizeOptions = {}): number {
  const { minMag, maxMag, minSize, maxSize } = { ...DEFAULT_SIZE_OPTS, ...opts };
  if (mag <= minMag) return maxSize;
  if (mag >= maxMag) return minSize;
  const t = (mag - minMag) / (maxMag - minMag);
  return maxSize - t * (maxSize - minSize);
}

export function magnitudeToBrightness(mag: number, refMag = -1.5): number {
  const b = Math.pow(10, -0.4 * (mag - refMag));
  return Math.min(1, Math.max(0, b));
}
