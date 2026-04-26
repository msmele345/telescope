"use client";

import type { SolarBody, SolarBodyKind } from "@/lib/solar-system";
import BodyCard, { Field, formatDec, formatRA } from "./popup/BodyCard";

export interface PlanetPopupProps {
  body: SolarBody | null;
  onClose: () => void;
}

const KIND_LABELS: Record<SolarBodyKind, string> = {
  sun: "Star (Sun)",
  moon: "Natural satellite",
  planet: "Planet",
};

export default function PlanetPopup({ body, onClose }: PlanetPopupProps) {
  if (!body) return null;

  return (
    <BodyCard
      titleId="planet-popup-title"
      title={body.name}
      subtitle={KIND_LABELS[body.kind]}
      onClose={onClose}
    >
      <Field label="Magnitude">{body.mag.toFixed(2)}</Field>
      <Field label="Distance">{formatDistance(body)}</Field>
      <Field label="Right ascension">{formatRA(body.ra)}</Field>
      <Field label="Declination">{formatDec(body.dec)}</Field>
      <Field label="Type">{KIND_LABELS[body.kind]}</Field>
    </BodyCard>
  );
}

function formatDistance(body: SolarBody): string {
  const au = body.distAU;
  // Moon is most readable in km; planets and Sun in AU.
  if (body.kind === "moon") {
    const km = au * 149_597_870.7;
    return `${Math.round(km).toLocaleString("en-US")} km`;
  }
  if (au < 0.05) {
    // Belt-and-suspenders: also show very-near distances in km.
    const km = au * 149_597_870.7;
    return `${Math.round(km).toLocaleString("en-US")} km`;
  }
  return `${au.toFixed(3)} AU`;
}
