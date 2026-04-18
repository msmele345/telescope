export const J2000_JD = 2451545.0;
export const JULIAN_CENTURY_DAYS = 36525;

export function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function julianCenturiesSinceJ2000(date: Date): number {
  return (toJulianDate(date) - J2000_JD) / JULIAN_CENTURY_DAYS;
}
