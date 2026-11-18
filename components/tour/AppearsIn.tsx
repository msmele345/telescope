import Link from "next/link";
import type { Tour } from "@/lib/tours";

export interface AppearsInProps {
  /** The tours with a stop in this constellation. */
  tours: readonly Tour[];
}

/** "Appears in: Winter Hexagon →" on a lesson page; nothing when the list is empty. */
export default function AppearsIn({ tours }: AppearsInProps) {
  if (tours.length === 0) return null;
  return (
    <nav aria-label="Tours" style={rowStyle}>
      <span style={labelStyle}>Appears in:</span>
      {tours.map((tour) => (
        <Link key={tour.slug} href={`/?tour=${tour.slug}`} style={linkStyle}>
          {tour.title} →
        </Link>
      ))}
    </nav>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: "6px 14px",
  margin: "0 0 24px",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  color: "#7e8aac",
};

const linkStyle: React.CSSProperties = {
  color: "#9ec0ff",
  textDecoration: "none",
};
