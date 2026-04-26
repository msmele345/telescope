"use client";

import Link from "next/link";
import type { Star } from "@/lib/star-catalog";
import { getConstellationByAbbr } from "@/lib/constellation";
import BodyCard, {
  Field,
  formatDec,
  formatRA,
  popupLinkStyle,
} from "./popup/BodyCard";

export interface StarPopupProps {
  star: Star | null;
  onClose: () => void;
}

export default function StarPopup({ star, onClose }: StarPopupProps) {
  if (!star) return null;

  const constellation = getConstellationByAbbr(star.constellation);
  const displayName = star.name ?? formatBayer(star) ?? `HR ${star.id}`;

  return (
    <BodyCard
      titleId="star-popup-title"
      title={displayName}
      subtitle={
        star.bayer && star.name ? formatBayer(star) ?? undefined : undefined
      }
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
      <Field label="Magnitude">{formatMagnitude(star.mag)}</Field>
      {hasDistance(star) && (
        <Field label="Distance">{formatDistance(star)}</Field>
      )}
      <Field label="Constellation">
        {constellation ? constellation.name : star.constellation ?? "—"}
      </Field>
      <Field label="Right ascension">{formatRA(star.ra)}</Field>
      <Field label="Declination">{formatDec(star.dec)}</Field>
      <Field label="Catalog">HR {star.id}</Field>
    </BodyCard>
  );
}

function formatBayer(star: Star): string | null {
  if (!star.bayer) return null;
  const cons = getConstellationByAbbr(star.constellation);
  return cons ? `${star.bayer} ${cons.genitive}` : star.bayer;
}

function formatMagnitude(mag: number): string {
  return mag.toFixed(2);
}

function hasDistance(star: Star): boolean {
  return typeof star.distLy === "number" && Number.isFinite(star.distLy);
}

function formatDistance(star: Star): string {
  return `${star.distLy!.toFixed(0)} ly`;
}
