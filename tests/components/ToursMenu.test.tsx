import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConstellationLines } from "@/lib/constellation";
import type { Star } from "@/lib/star-catalog";
import { DEFAULT_OBSERVER, type ObserverLocation } from "@/lib/observer";
import { findTourTime, formatClock, formatNightOf, getTourBySlug, type Tour, type TourStop } from "@/lib/tours";

function readJson<T>(file: string): T {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "public", "data", file), "utf8")
  ) as T;
}
const CATALOGS = vi.hoisted(() => ({ value: null as unknown }));
CATALOGS.value = {
  stars: readJson<Star[]>("bsc5.json"),
  lines: readJson<ConstellationLines>("constellation-lines.json"),
};
const loadTourCatalogs = vi.hoisted(() => vi.fn(async () => CATALOGS.value));
vi.mock("@/lib/tours/load-catalogs", () => ({ loadTourCatalogs }));

import ToursMenu from "@/components/tour/ToursMenu";

// --- Fixtures --------------------------------------------------------------

function stop(ref: Pick<TourStop, "kind" | "id">): TourStop {
  return { ...ref, heading: "", body: "" } as TourStop;
}

function tour(slug: string, title: string, window: Tour["window"], stops: TourStop[]): Tour {
  return { slug, title, summary: `${title} summary.`, window, stops };
}

const ORION = getTourBySlug("orion-fixture") as Tour;
const SPRING = tour(
  "spring-fixture",
  "Spring Arc",
  { from: { month: 3, day: 1 }, to: { month: 6, day: 30 } },
  [stop({ kind: "constellation", id: "UMa" }), stop({ kind: "star", id: 5340 }), stop({ kind: "constellation", id: "Boo" })]
);
const SUMMER = tour(
  "summer-fixture",
  "Summer Triangle",
  { from: { month: 6, day: 1 }, to: { month: 9, day: 30 } },
  [stop({ kind: "star", id: 7001 }), stop({ kind: "star", id: 7924 }), stop({ kind: "star", id: 7557 })]
);
/** Crux never gets above 20° from Kansas, so this tour has no tour time. */
const SOUTHERN = tour(
  "southern-fixture",
  "Southern Cross",
  { from: { month: 1, day: 1 }, to: { month: 12, day: 31 } },
  [stop({ kind: "constellation", id: "Cru" })]
);
// Registry order deliberately differs from tour-time order.
const TOURS = [SOUTHERN, SUMMER, ORION, SPRING];

/** Early afternoon in Kansas on a night Orion is up: its tour time is tonight. */
const NOW = new Date(Date.UTC(2027, 0, 10, 20, 0));

function timeOf(t: Tour, observer: ObserverLocation = DEFAULT_OBSERVER) {
  return findTourTime(t, observer, NOW, CATALOGS.value as never);
}

function renderMenu() {
  const user = userEvent.setup();
  render(<ToursMenu tours={TOURS} getObserver={() => DEFAULT_OBSERVER} getRealNow={() => NOW} />);
  return { user, toggle: screen.getByRole("button", { name: "Tours" }) };
}

async function openList() {
  const view = renderMenu();
  await view.user.click(view.toggle);
  const list = await screen.findByRole("list", { name: "Tours" });
  return { ...view, list };
}

beforeEach(() => {
  loadTourCatalogs.mockClear();
});

// --- Tests -----------------------------------------------------------------

describe("ToursMenu", () => {
  it("starts closed, with a Tours button", () => {
    const { toggle } = renderMenu();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list", { name: "Tours" })).not.toBeInTheDocument();
  });

  it("lists every tour as a list, soonest tour time first, unseeable last", async () => {
    const { list, toggle } = await openList();
    // Explicit, so Safari keeps list semantics on an unstyled list.
    expect(list).toHaveAttribute("role", "list");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual([
      "Around Orion",
      "Spring Arc",
      "Summer Triangle",
      "Southern Cross",
    ]);
  });

  it("shows each tour's summary, number of stops and next tour time", async () => {
    const { list } = await openList();
    const orionTime = timeOf(ORION)!;
    const summerTime = timeOf(SUMMER)!;
    expect(orionTime.tonight).toBe(true);
    expect(summerTime.tonight).toBe(false);

    const [orion, , summer] = within(list).getAllByRole("listitem");
    expect(within(orion).getByText(ORION.summary)).toBeInTheDocument();
    expect(within(orion).getByText("5 stops")).toBeInTheDocument();
    expect(within(orion).getByText(`Next: Tonight ${formatClock(orionTime.at)}`)).toBeInTheDocument();
    expect(within(summer).getByText("3 stops")).toBeInTheDocument();
    expect(within(summer).getByText(`Next: ${formatNightOf(summerTime.at)}`)).toBeInTheDocument();
  });

  it("links each playable tour to /?tour=<slug>, including out-of-season ones", async () => {
    const { list } = await openList();
    const [orion, spring, summer] = within(list).getAllByRole("listitem");
    expect(within(orion).getByRole("link")).toHaveAttribute("href", "/?tour=orion-fixture");
    expect(within(spring).getByRole("link")).toHaveAttribute("href", "/?tour=spring-fixture");
    expect(within(summer).getByRole("link")).toHaveAttribute("href", "/?tour=summer-fixture");
  });

  it("can't start a tour with no tour time, and says why", async () => {
    const { list } = await openList();
    const southern = within(list).getAllByRole("listitem")[3];
    expect(within(southern).getByText("Not visible from your location")).toBeInTheDocument();
    expect(within(southern).queryByRole("link")).not.toBeInTheDocument();
  });

  it("finds tour times for the current observer", async () => {
    const north = { lat: 49, lng: -97 };
    const user = userEvent.setup();
    const getObserver = vi.fn(() => north);
    render(<ToursMenu tours={[ORION]} getObserver={getObserver} getRealNow={() => NOW} />);
    await user.click(screen.getByRole("button", { name: "Tours" }));
    const item = (await screen.findAllByRole("listitem"))[0];
    expect(getObserver).toHaveBeenCalled();
    expect(item).toHaveTextContent(
      timeOf(ORION, north)!.tonight
        ? `Next: Tonight ${formatClock(timeOf(ORION, north)!.at)}`
        : `Next: ${formatNightOf(timeOf(ORION, north)!.at)}`
    );
  });

  it("closes when a tour is chosen", async () => {
    const { list, user } = await openList();
    const link = within(within(list).getAllByRole("listitem")[0]).getByRole("link");
    link.addEventListener("click", (e) => e.preventDefault()); // jsdom can't navigate
    await user.click(link);
    expect(screen.queryByRole("list", { name: "Tours" })).not.toBeInTheDocument();
  });

  describe("keyboard", () => {
    it("opens from the keyboard and moves focus to the first tour", async () => {
      const { user, toggle } = renderMenu();
      toggle.focus();
      await user.keyboard("{Enter}");
      const list = await screen.findByRole("list", { name: "Tours" });
      const first = within(within(list).getAllByRole("listitem")[0]).getByRole("link");
      expect(first).toHaveFocus();
    });

    it("moves between tours with the arrow keys, stopping at the ends", async () => {
      const { user, list } = await openList();
      const links = within(list).getAllByRole("link");
      expect(links[0]).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(links[0]).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(links[1]).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(links[0]).toHaveFocus();
    });

    it("reaches a tour that can't be started, so its reason is read out", async () => {
      const { user, list } = await openList();
      const southern = within(list).getAllByRole("listitem")[3];
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
      expect(southern.firstElementChild).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(southern.firstElementChild).toHaveFocus();
    });

    it("closes on Esc and returns focus to the Tours button", async () => {
      const { user } = await openList();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("list", { name: "Tours" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tours" })).toHaveFocus();
    });
  });
});
