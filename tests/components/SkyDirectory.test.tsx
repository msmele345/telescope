import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Star } from "@/lib/star-catalog";

const CATALOG: Star[] = [
  { id: 2061, ra: 1.55, dec: 0.13, mag: 0.5, name: "Betelgeuse", bayer: "α", constellation: "Ori" },
  { id: 7001, ra: 4.87, dec: 0.68, mag: 0.03, name: "Vega", bayer: "α", constellation: "Lyr" },
];

// Keep the real pure search; only stub the network catalog load.
vi.mock("@/lib/star-catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/star-catalog")>();
  return { ...actual, loadCatalog: vi.fn(async () => CATALOG) };
});

import SkyDirectory from "@/components/SkyDirectory";

describe("<SkyDirectory />", () => {
  it("opens from the toggle and focuses the search field", async () => {
    const user = userEvent.setup();
    render(<SkyDirectory onSelectStar={() => {}} />);
    await user.click(screen.getByRole("button", { name: /search the sky/i }));
    const input = await screen.findByRole("searchbox");
    expect(input).toHaveFocus();
  });

  it("finds a star and invokes onSelectStar with the catalog entry", async () => {
    const onSelectStar = vi.fn();
    const user = userEvent.setup();
    render(<SkyDirectory onSelectStar={onSelectStar} />);
    await user.click(screen.getByRole("button", { name: /search the sky/i }));
    await user.type(await screen.findByRole("searchbox"), "betel");
    const result = await screen.findByRole("button", { name: /Betelgeuse/i });
    await user.click(result);
    expect(onSelectStar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2061, name: "Betelgeuse" })
    );
  });

  it("links a constellation result to its page", async () => {
    const user = userEvent.setup();
    render(<SkyDirectory onSelectStar={() => {}} />);
    await user.click(screen.getByRole("button", { name: /search the sky/i }));
    await user.type(await screen.findByRole("searchbox"), "orion");
    const link = await screen.findByRole("link", { name: /Orion/i });
    expect(link).toHaveAttribute("href", "/constellations/orion");
  });

  it("announces result counts in a live region", async () => {
    const user = userEvent.setup();
    render(<SkyDirectory onSelectStar={() => {}} />);
    await user.click(screen.getByRole("button", { name: /search the sky/i }));
    await user.type(await screen.findByRole("searchbox"), "vega");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/1 star/i)
    );
  });

  it("closes on Escape and restores focus to the toggle", async () => {
    const user = userEvent.setup();
    render(<SkyDirectory onSelectStar={() => {}} />);
    const toggle = screen.getByRole("button", { name: /search the sky/i });
    await user.click(toggle);
    await screen.findByRole("searchbox");
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /search the sky/i })
      ).toHaveFocus()
    );
  });
});
