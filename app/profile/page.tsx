import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import {
  listFavorites,
  listRead,
  listViewed,
  type FavoriteRow,
  type TimestampedRow,
} from "@/lib/user-data";
import { getStarsByIds } from "@/lib/star-catalog/server";
import { getConstellationBySlug } from "@/lib/constellation";
import ProfileSections, {
  type FavoriteConstellationEntry,
  type FavoriteStarEntry,
  type TimestampedConstellationEntry,
} from "@/components/user/ProfileSections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile — Telescope",
  description: "Your favorited stars, constellations, and lesson history.",
};

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [favorites, viewedRows, readRows] = await Promise.all([
    listFavorites(userId),
    listViewed(userId),
    listRead(userId),
  ]);

  const { favoriteStars, favoriteConstellations } = await buildFavorites(
    favorites
  );
  const viewed = buildTimestampedConstellations(viewedRows);
  const read = buildTimestampedConstellations(readRows);

  return (
    <main style={pageStyle}>
      <Link href="/" style={backLinkStyle}>
        ← Back to the sky
      </Link>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Your sky</h1>
        <p style={subtitleStyle}>
          {session.user?.email ?? session.user?.name ?? "Signed in"} — favorites,
          viewed constellations, and lessons you’ve read.
        </p>
      </header>
      <ProfileSections
        favoriteStars={favoriteStars}
        favoriteConstellations={favoriteConstellations}
        viewed={viewed}
        read={read}
      />
    </main>
  );
}

async function buildFavorites(favorites: FavoriteRow[]): Promise<{
  favoriteStars: FavoriteStarEntry[];
  favoriteConstellations: FavoriteConstellationEntry[];
}> {
  const starRows = favorites.filter((f) => f.target_type === "star");
  const constellationRows = favorites.filter(
    (f) => f.target_type === "constellation"
  );

  const stars = await getStarsByIds(starRows.map((r) => r.target_id));
  const starsById = new Map(stars.map((s) => [String(s.id), s]));

  const favoriteStars: FavoriteStarEntry[] = [];
  for (const row of starRows) {
    const star = starsById.get(row.target_id);
    if (!star) continue;
    favoriteStars.push({ star, createdAt: row.created_at });
  }

  const favoriteConstellations: FavoriteConstellationEntry[] = [];
  for (const row of constellationRows) {
    const constellation = getConstellationBySlug(row.target_id);
    if (!constellation) continue;
    favoriteConstellations.push({
      constellation,
      createdAt: row.created_at,
    });
  }

  return { favoriteStars, favoriteConstellations };
}

function buildTimestampedConstellations(
  rows: TimestampedRow[]
): TimestampedConstellationEntry[] {
  const out: TimestampedConstellationEntry[] = [];
  for (const row of rows) {
    const constellation = getConstellationBySlug(row.constellation_id);
    if (!constellation) continue;
    out.push({ constellation, ts: row.ts });
  }
  return out;
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "80px 24px 64px",
  color: "#e5ecff",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  lineHeight: 1.5,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 13,
  marginBottom: 32,
};

const headerStyle: React.CSSProperties = { marginBottom: 36 };

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 600,
  letterSpacing: "-0.01em",
};

const subtitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#98a6c9",
  fontSize: 14,
};
