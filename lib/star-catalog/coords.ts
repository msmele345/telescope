export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function celestialToVec3(ra: number, dec: number, radius = 1): Vec3 {
  const cosDec = Math.cos(dec);
  return {
    x: radius * cosDec * Math.cos(ra),
    y: radius * Math.sin(dec),
    z: radius * cosDec * Math.sin(ra),
  };
}
