"use client";

import Link from "next/link";
import type { MessierObject, MessierType } from "@/lib/messier";
import { getConstellationByAbbr } from "@/lib/constellation";
import BodyCard, {
  Field,
  formatDec,
  formatRA,
  popupLinkStyle,
} from "./popup/BodyCard";

export interface MessierPopupProps {
  object: MessierObject | null;
  onClose: () => void;
}

const TYPE_LABELS: Record<MessierType, string> = {
  galaxy: "Galaxy",
  "globular-cluster": "Globular cluster",
  "open-cluster": "Open cluster",
  nebula: "Nebula",
  "planetary-nebula": "Planetary nebula",
  "supernova-remnant": "Supernova remnant",
  "double-star": "Double star",
  asterism: "Asterism",
};

export default function MessierPopup({ object, onClose }: MessierPopupProps) {
  if (!object) return null;

  const constellation = getConstellationByAbbr(object.constellation);
  const displayName = object.name ?? object.id;
  const subtitle = object.name ? object.id : undefined;

  return (
    <BodyCard
      titleId="messier-popup-title"
      title={displayName}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        constellation && (
          <Link
            href={`/constellations/${constellation.slug}`}
            style={popupLinkStyle}
          >
            Read about {constellation.name} →
          </Link>
        )
      }
    >
      <Field label="Type">{TYPE_LABELS[object.type]}</Field>
      <Field label="Magnitude">{object.mag.toFixed(1)}</Field>
      <Field label="Constellation">
        {constellation ? constellation.name : object.constellation}
      </Field>
      <Field label="Right ascension">{formatRA(object.ra)}</Field>
      <Field label="Declination">{formatDec(object.dec)}</Field>
      <Field label="Catalog">{object.id}</Field>
    </BodyCard>
  );
}
