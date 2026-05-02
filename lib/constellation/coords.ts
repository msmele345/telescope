/**
 * Pure RA/Dec formatters used by both server and client components.
 */

export function formatRAShort(raRad: number): string {
  const hours = ((raRad * (12 / Math.PI)) % 24 + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 60) {
    return `${pad2((h + 1) % 24)}h 00m`;
  }
  return `${pad2(h)}h ${pad2(m)}m`;
}

export function formatDecShort(decRad: number): string {
  const deg = decRad * (180 / Math.PI);
  const sign = deg < 0 ? "−" : "+";
  return `${sign}${Math.abs(Math.round(deg))}°`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
