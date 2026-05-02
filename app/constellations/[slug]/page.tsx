import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CONSTELLATIONS,
  getConstellationBySlug,
} from "@/lib/constellation";
import { hasLesson } from "@/lib/constellation/lessons";
import { getLessonComponent } from "@/lib/constellation/lessonComponents";
import { getConstellationMembers } from "@/lib/constellation/server";
import ConstellationContent from "@/components/ConstellationContent";

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return CONSTELLATIONS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const c = getConstellationBySlug(params.slug);
  if (!c) return { title: "Constellation — Telescope" };
  const description = hasLesson(c.slug)
    ? `Mythology and lessons for the ${c.name} constellation.`
    : `${c.name} — coming soon to Telescope.`;
  return {
    title: `${c.name} — Telescope`,
    description,
  };
}

export default async function ConstellationPage({ params }: PageProps) {
  const c = getConstellationBySlug(params.slug);
  if (!c) notFound();

  const Lesson = getLessonComponent(c.slug);
  const members = Lesson ? null : await getConstellationMembers(c.abbr);

  return (
    <main style={pageStyle}>
      <Link href="/" style={backLinkStyle}>
        ← Back to the sky
      </Link>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>
          {c.abbr} · {c.genitive}
        </p>
        <h1 style={titleStyle}>{c.name}</h1>
      </header>
      <ConstellationContent
        name={c.name}
        lesson={Lesson ? <Lesson /> : null}
        members={members}
      />
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
  lineHeight: 1.65,
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
