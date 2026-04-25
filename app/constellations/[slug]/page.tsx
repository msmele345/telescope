import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CONSTELLATIONS,
  getConstellationBySlug,
} from "@/lib/constellation";

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return CONSTELLATIONS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const c = getConstellationBySlug(params.slug);
  if (!c) return { title: "Constellation — Telescope" };
  return {
    title: `${c.name} — Telescope`,
    description: `Mythology, lore, and lessons for the ${c.name} constellation.`,
  };
}

export default function ConstellationPage({ params }: PageProps) {
  const c = getConstellationBySlug(params.slug);
  if (!c) notFound();

  return (
    <main style={pageStyle}>
      <Link href="/" style={backLinkStyle}>
        ← Back to the sky
      </Link>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>{c.abbr} · {c.genitive}</p>
        <h1 style={titleStyle}>{c.name}</h1>
      </header>
      <section style={comingSoonStyle}>
        <p>
          Mythology and lessons for <strong>{c.name}</strong> are coming soon.
        </p>
        <p style={hintStyle}>
          In the meantime, head back to the sky map to see {c.name} in the
          context of the surrounding stars.
        </p>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "48px 24px 80px",
  color: "#e5ecff",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  lineHeight: 1.55,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 13,
  marginBottom: 32,
};

const headerStyle: React.CSSProperties = {
  marginBottom: 32,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#7e8aac",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 48,
  fontWeight: 600,
  letterSpacing: "-0.01em",
};

const comingSoonStyle: React.CSSProperties = {
  background: "rgba(120, 150, 220, 0.08)",
  border: "1px solid rgba(120, 150, 220, 0.2)",
  borderRadius: 12,
  padding: "20px 22px",
};

const hintStyle: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 0,
  color: "#98a6c9",
  fontSize: 14,
};
