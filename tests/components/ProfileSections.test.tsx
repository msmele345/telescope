import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Star } from "@/lib/star-catalog";
import { getConstellationBySlug } from "@/lib/constellation";
import ProfileSections, {
  type FavoriteConstellationEntry,
  type FavoriteStarEntry,
  type TimestampedConstellationEntry,
} from "@/components/user/ProfileSections";

const orion = getConstellationBySlug("orion")!;
const leo = getConstellationBySlug("leo")!;

const sirius: Star = {
  id: 2491,
  ra: 1.767,
  dec: -0.291,
  mag: -1.46,
  name: "Sirius",
  bayer: "α",
  constellation: "CMa",
  distLy: 8.6,
};

const unnamedStar: Star = {
  id: 9999,
  ra: 0,
  dec: 0,
  mag: 5.12,
  bayer: "β",
  constellation: "Ori",
};

function renderSections(partial: {
  favoriteStars?: FavoriteStarEntry[];
  favoriteConstellations?: FavoriteConstellationEntry[];
  viewed?: TimestampedConstellationEntry[];
  read?: TimestampedConstellationEntry[];
} = {}) {
  return render(
    <ProfileSections
      favoriteStars={partial.favoriteStars ?? []}
      favoriteConstellations={partial.favoriteConstellations ?? []}
      viewed={partial.viewed ?? []}
      read={partial.read ?? []}
    />
  );
}

describe("<ProfileSections />", () => {
  it("renders empty states for all sections when nothing is saved", () => {
    renderSections();
    expect(screen.getByText(/no favorite stars yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no favorite constellations yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no constellations marked viewed yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no lessons read yet/i)).toBeInTheDocument();
  });

  it("links a favorited named star back to the map with focus query param", () => {
    renderSections({
      favoriteStars: [{ star: sirius, createdAt: new Date("2026-01-15T00:00:00Z") }],
    });
    const link = screen.getByRole("link", { name: /sirius/i });
    expect(link).toHaveAttribute("href", "/?star=2491");
    expect(screen.getByText(/mag -1\.46 · canis major/i)).toBeInTheDocument();
  });

  it("falls back to Bayer designation for unnamed stars", () => {
    renderSections({
      favoriteStars: [{ star: unnamedStar, createdAt: new Date("2026-02-01T00:00:00Z") }],
    });
    expect(
      screen.getByRole("link", { name: /β orionis/i })
    ).toHaveAttribute("href", "/?star=9999");
  });

  it("renders favorite constellations linking to their pages", () => {
    renderSections({
      favoriteConstellations: [
        { constellation: orion, createdAt: new Date("2026-03-01T00:00:00Z") },
      ],
    });
    const link = screen.getByRole("link", { name: /^orion$/i });
    expect(link).toHaveAttribute("href", "/constellations/orion");
  });

  it("renders viewed and read sections with constellation links", () => {
    renderSections({
      viewed: [
        { constellation: orion, ts: new Date("2026-04-01T00:00:00Z") },
      ],
      read: [
        { constellation: leo, ts: new Date("2026-04-05T00:00:00Z") },
      ],
    });
    const viewedLink = screen.getByRole("link", { name: /^orion$/i });
    expect(viewedLink).toHaveAttribute("href", "/constellations/orion");
    const readLink = screen.getByRole("link", { name: /^leo$/i });
    expect(readLink).toHaveAttribute("href", "/constellations/leo");
  });
});
