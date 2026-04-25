"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Star } from "@/lib/star-catalog";
import { getConstellationByAbbr } from "@/lib/constellation";

export interface StarPopupProps {
  star: Star | null;
  onClose: () => void;
}

const RAD_TO_HOURS = 12 / Math.PI;
const RAD_TO_DEG = 180 / Math.PI;

export default function StarPopup({ star, onClose }: StarPopupProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!star) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    // mousedown so we don't dismiss before a click on internal elements registers
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [star, onClose]);

  if (!star) return null;

  const constellation = getConstellationByAbbr(star.constellation);
  const displayName = star.name ?? formatBayer(star) ?? `HR ${star.id}`;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="star-popup-title"
      style={cardStyle}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={closeButtonStyle}
      >
        ×
      </button>
      <h2 id="star-popup-title" style={titleStyle}>
        {displayName}
      </h2>
      {star.bayer && star.name && (
        <div style={subtitleStyle}>{formatBayer(star)}</div>
      )}

      <dl style={dlStyle}>
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
      </dl>

      {constellation && (
        <Link
          href={`/constellations/${constellation.slug}`}
          style={linkStyle}
        >
          Read about {constellation.name} →
        </Link>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
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

function formatRA(raRad: number): string {
  const hours = ((raRad * RAD_TO_HOURS) % 24 + 24) % 24;
  const h = Math.floor(hours);
  const mTotal = (hours - h) * 60;
  const m = Math.floor(mTotal);
  const s = (mTotal - m) * 60;
  return `${pad2(h)}h ${pad2(m)}m ${s.toFixed(1)}s`;
}

function formatDec(decRad: number): string {
  const deg = decRad * RAD_TO_DEG;
  const sign = deg < 0 ? "−" : "+";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mTotal = (abs - d) * 60;
  const m = Math.floor(mTotal);
  const s = (mTotal - m) * 60;
  return `${sign}${pad2(d)}° ${pad2(m)}′ ${s.toFixed(0)}″`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

const cardStyle: React.CSSProperties = {
  position: "fixed",
  top: 80,
  right: 24,
  width: "min(340px, 92vw)",
  background: "rgba(8, 10, 22, 0.92)",
  border: "1px solid rgba(120, 150, 220, 0.32)",
  borderRadius: 12,
  padding: "16px 18px 18px",
  color: "#e5ecff",
  fontSize: 13,
  lineHeight: 1.45,
  backdropFilter: "blur(10px)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
  zIndex: 30,
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 10,
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "transparent",
  color: "#9ec0ff",
  border: "1px solid rgba(120, 150, 220, 0.35)",
  fontSize: 18,
  lineHeight: "1",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  color: "#fff",
  paddingRight: 32,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 2,
  color: "#9aaad0",
  fontStyle: "italic",
  fontSize: 12,
};

const dlStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  columnGap: 12,
  rowGap: 4,
  margin: "14px 0 12px",
};

const dtStyle: React.CSSProperties = {
  color: "#7e8aac",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const ddStyle: React.CSSProperties = {
  margin: 0,
  color: "#e5ecff",
  fontVariantNumeric: "tabular-nums",
};

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 500,
  borderBottom: "1px solid rgba(158, 192, 255, 0.4)",
  paddingBottom: 1,
};
