"use client";

import { forwardRef, useEffect, useRef } from "react";

export interface BodyCardProps {
  titleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional CTA rendered below the field list. */
  footer?: React.ReactNode;
}

/**
 * Shared chrome for popups that describe a clickable sky object: card
 * positioning, close button, escape + click-outside dismiss, dl layout.
 * Each caller supplies the body-specific fields as `children`.
 */
const BodyCard = forwardRef<HTMLDivElement, BodyCardProps>(function BodyCard(
  { titleId, title, subtitle, onClose, children, footer },
  forwardedRef
) {
  const localRef = useRef<HTMLDivElement>(null);
  const cardRef = (forwardedRef as React.RefObject<HTMLDivElement>) ?? localRef;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      const node = cardRef.current;
      if (node && !node.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [onClose, cardRef]);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
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
      <h2 id={titleId} style={titleStyle}>
        {title}
      </h2>
      {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
      <dl style={dlStyle}>{children}</dl>
      {footer}
    </div>
  );
});

export default BodyCard;

export interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
  );
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

export const popupLinkStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 500,
  borderBottom: "1px solid rgba(158, 192, 255, 0.4)",
  paddingBottom: 1,
};

export const RAD_TO_HOURS = 12 / Math.PI;
export const RAD_TO_DEG = 180 / Math.PI;

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatRA(raRad: number): string {
  const hours = ((raRad * RAD_TO_HOURS) % 24 + 24) % 24;
  const h = Math.floor(hours);
  const mTotal = (hours - h) * 60;
  const m = Math.floor(mTotal);
  const s = (mTotal - m) * 60;
  return `${pad2(h)}h ${pad2(m)}m ${s.toFixed(1)}s`;
}

export function formatDec(decRad: number): string {
  const deg = decRad * RAD_TO_DEG;
  const sign = deg < 0 ? "−" : "+";
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mTotal = (abs - d) * 60;
  const m = Math.floor(mTotal);
  const s = (mTotal - m) * 60;
  return `${sign}${pad2(d)}° ${pad2(m)}′ ${s.toFixed(0)}″`;
}
