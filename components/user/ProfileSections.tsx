import Link from "next/link";
import type { Star } from "@/lib/star-catalog";
import {
  getConstellationByAbbr,
  getConstellationBySlug,
  type ConstellationMeta,
} from "@/lib/constellation";

export interface FavoriteStarEntry {
  star: Star;
  createdAt: Date;
}

export interface FavoriteConstellationEntry {
  constellation: ConstellationMeta;
  createdAt: Date;
}

export interface TimestampedConstellationEntry {
  constellation: ConstellationMeta;
  ts: Date;
}

export interface ProfileSectionsProps {
  favoriteStars: FavoriteStarEntry[];
  favoriteConstellations: FavoriteConstellationEntry[];
  viewed: TimestampedConstellationEntry[];
  read: TimestampedConstellationEntry[];
}

export default function ProfileSections({
  favoriteStars,
  favoriteConstellations,
  viewed,
  read,
}: ProfileSectionsProps) {
  return (
    <div style={containerStyle}>
      <Section title="Favorite stars" emptyText="No favorite stars yet — click a star on the map and tap the heart to start collecting.">
        {favoriteStars.length > 0 && (
          <ul style={listStyle}>
            {favoriteStars.map(({ star, createdAt }) => (
              <li key={`star-${star.id}`} style={itemStyle}>
                <Link href={`/?star=${star.id}`} style={linkStyle}>
                  {starDisplayName(star)}
                </Link>
                <span style={metaStyle}>
                  {starMeta(star)} · favorited {formatDate(createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Favorite constellations"
        emptyText="No favorite constellations yet — open a constellation page and tap the heart."
      >
        {favoriteConstellations.length > 0 && (
          <ul style={listStyle}>
            {favoriteConstellations.map(({ constellation, createdAt }) => (
              <li key={`fav-c-${constellation.slug}`} style={itemStyle}>
                <Link
                  href={`/constellations/${constellation.slug}`}
                  style={linkStyle}
                >
                  {constellation.name}
                </Link>
                <span style={metaStyle}>
                  favorited {formatDate(createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Viewed constellations"
        emptyText="No constellations marked viewed yet — explore the sky and mark the ones you've found."
      >
        {viewed.length > 0 && (
          <ul style={listStyle}>
            {viewed.map(({ constellation, ts }) => (
              <li key={`viewed-${constellation.slug}`} style={itemStyle}>
                <Link
                  href={`/constellations/${constellation.slug}`}
                  style={linkStyle}
                >
                  {constellation.name}
                </Link>
                <span style={metaStyle}>viewed {formatDate(ts)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Read lessons"
        emptyText="No lessons read yet — open an authored constellation page and tap “Mark as read”."
      >
        {read.length > 0 && (
          <ul style={listStyle}>
            {read.map(({ constellation, ts }) => (
              <li key={`read-${constellation.slug}`} style={itemStyle}>
                <Link
                  href={`/constellations/${constellation.slug}`}
                  style={linkStyle}
                >
                  {constellation.name}
                </Link>
                <span style={metaStyle}>read {formatDate(ts)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  emptyText: string;
  children?: React.ReactNode;
}

function Section({ title, emptyText, children }: SectionProps) {
  const hasContent =
    Array.isArray(children)
      ? children.some(Boolean)
      : Boolean(children);
  return (
    <section style={sectionStyle} aria-labelledby={slugify(title)}>
      <h2 id={slugify(title)} style={sectionTitleStyle}>
        {title}
      </h2>
      {hasContent ? children : <p style={emptyStateStyle}>{emptyText}</p>}
    </section>
  );
}

function starDisplayName(star: Star): string {
  if (star.name) return star.name;
  if (star.bayer) {
    const cons = getConstellationByAbbr(star.constellation);
    return cons ? `${star.bayer} ${cons.genitive}` : star.bayer;
  }
  return `HR ${star.id}`;
}

function starMeta(star: Star): string {
  const cons = getConstellationByAbbr(star.constellation);
  const constellation = cons?.name ?? star.constellation ?? "—";
  return `mag ${star.mag.toFixed(2)} · ${constellation}`;
}

function slugify(s: string): string {
  return `profile-section-${s.toLowerCase().replace(/\s+/g, "-")}`;
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(d: Date): string {
  return DATE_FMT.format(d);
}

export function resolveConstellation(
  slug: string
): ConstellationMeta | null {
  return getConstellationBySlug(slug);
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 36,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  color: "#e5ecff",
  letterSpacing: "-0.005em",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: 10,
  padding: "10px 14px",
  background: "rgba(120, 150, 220, 0.06)",
  border: "1px solid rgba(120, 150, 220, 0.15)",
  borderRadius: 8,
};

const linkStyle: React.CSSProperties = {
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 500,
};

const metaStyle: React.CSSProperties = {
  color: "#7e8aac",
  fontSize: 12,
};

const emptyStateStyle: React.CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  background: "rgba(120, 150, 220, 0.04)",
  border: "1px dashed rgba(120, 150, 220, 0.25)",
  borderRadius: 8,
  color: "#98a6c9",
  fontSize: 13,
  lineHeight: 1.5,
};
