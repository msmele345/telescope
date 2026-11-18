import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConstellationLines } from "@/lib/constellation";
import type { Star } from "@/lib/star-catalog";
import { DEFAULT_OBSERVER, type ObserverLocation } from "@/lib/observer";
import { findTourTime, formatClock, getTourBySlug, jumpLabel, type Tour } from "@/lib/tours";

// --- Stubs -----------------------------------------------------------------

const nav = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => "/",
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));

// The canvas is WebGL; stand it in with a stub that records its props.
const canvas = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }));
vi.mock("next/dynamic", () => ({
  default: () =>
    function SkyCanvasStub(props: Record<string, unknown>) {
      canvas.props = props;
      return <div data-testid="sky-canvas" />;
    },
}));

// Stub server actions so jsdom does not evaluate the auth module at import time.
const actions = vi.hoisted(() => ({
  getFavoriteState: vi.fn(async () => ({ status: "unauth" as const })),
  toggleFavorite: vi.fn(async () => ({ status: "unauth" as const })),
  toggleViewed: vi.fn(),
  toggleRead: vi.fn(),
}));
vi.mock("@/app/actions/user-data", () => actions);

import Home from "@/app/page";

// --- Fixtures --------------------------------------------------------------

function readData(file: string): string {
  return readFileSync(path.join(process.cwd(), "public", "data", file), "utf8");
}
const STARS_JSON = readData("bsc5.json");
const LINES_JSON = readData("constellation-lines.json");
const CATALOGS = {
  stars: JSON.parse(STARS_JSON) as Star[],
  lines: JSON.parse(LINES_JSON) as ConstellationLines,
};

const TOUR = getTourBySlug("orion-fixture") as Tour;
const OBSERVER_KEY = "telescope:observer";
const MINUTE = 60_000;

/** Early afternoon in Kansas on a night the fixture is up: the tour time is tonight. */
const TONIGHT_NOW = Date.UTC(2027, 0, 10, 20, 0);
/** Before the fixture's window opens (Dec 1): the tour time is a later night. */
const LATER_NOW = Date.UTC(2026, 10, 17, 20, 0);

/** Where no fixture stop gets above 20°: Orion's stars never climb that high from 70°N. */
const ARCTIC = { lat: 70, lng: -150, label: "Arctic test observer" };

function tourTimeFrom(nowMs: number, observer: ObserverLocation = DEFAULT_OBSERVER) {
  const time = findTourTime(TOUR, observer, new Date(nowMs), CATALOGS);
  if (!time) throw new Error("fixture has no tour time");
  return time;
}

/** The scrubber's UTC readout for an instant. */
function readout(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

function saveObserver(o: object) {
  window.localStorage.setItem(OBSERVER_KEY, JSON.stringify({ v: 1, observer: o }));
}

function setNow(ms: number) {
  vi.setSystemTime(ms);
}

function advance(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

async function openTour(search = "?tour=orion-fixture") {
  nav.search = search;
  const user = userEvent.setup();
  const view = render(<Home />);
  const panel = await screen.findByRole("region", { name: /tour: around orion/i });
  return { user, view, panel };
}

function scrubberGroup() {
  return screen.getByRole("group", { name: /time controls/i });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(TONIGHT_NOW);
  nav.search = "";
  nav.replace.mockClear();
  canvas.props = null;
  window.localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body =
        url === "/data/bsc5.json"
          ? STARS_JSON
          : url === "/data/constellation-lines.json"
            ? LINES_JSON
            : null;
      if (body === null) return { ok: false, status: 404, statusText: "Not Found" };
      return { ok: true, status: 200, json: async () => JSON.parse(body) };
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// --- Tests -----------------------------------------------------------------

describe("tour player: starting", () => {
  it("starts /?tour=<slug> at stop 1 with no confirmation step", async () => {
    const { panel } = await openTour();
    expect(within(panel).getByRole("heading", { name: "Orion, the Hunter" })).toBeInTheDocument();
    expect(within(panel).getByText("Stop 1 of 5")).toBeInTheDocument();
    expect(canvas.props?.focus).toMatchObject({ kind: "constellation", id: "Ori" });
  });

  it("sets the virtual time to the tour time, paused", async () => {
    const time = tourTimeFrom(TONIGHT_NOW);
    await openTour();
    expect(time.tonight).toBe(true);
    expect((canvas.props?.when as Date).getTime()).toBe(time.at.getTime());
    expect(screen.getByText(readout(time.at.getTime()))).toBeInTheDocument();
    advance(10 * MINUTE);
    expect(screen.getByText(readout(time.at.getTime()))).toBeInTheDocument();
  });

  it("says nothing about a jump when the tour time is tonight", async () => {
    const { panel } = await openTour();
    expect(within(panel).queryByText(/showing the sky on the night of/i)).not.toBeInTheDocument();
  });

  it("labels the jump with the night-of date when the tour time is not tonight", async () => {
    setNow(LATER_NOW);
    const time = tourTimeFrom(LATER_NOW);
    expect(time.tonight).toBe(false);
    const { panel } = await openTour();
    expect(within(panel).getByText(jumpLabel(time.at))).toBeInTheDocument();
  });

  it("ignores an unknown slug and loads the map normally", async () => {
    nav.search = "?tour=no-such-tour";
    render(<Home />);
    await act(async () => {});
    expect(screen.queryByRole("region", { name: /tour:/i })).not.toBeInTheDocument();
    expect(canvas.props?.focus ?? null).toBeNull();
    expect(screen.getByRole("button", { name: /pause/i })).toBeEnabled();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("works with no saved location, using the default observer, and keeps the location banner", async () => {
    nav.search = "";
    const { unmount } = render(<Home />);
    const bannerBefore = screen.getByRole("button", { name: /location/i }).textContent;
    unmount();

    await openTour();
    expect(canvas.props?.observer).toEqual(DEFAULT_OBSERVER);
    expect(screen.getByRole("button", { name: /location/i }).textContent).toBe(bannerBefore);
  });
});

describe("tour player: no tour time", () => {
  it("shows a dismissible notice, doesn't start, and leaves time and view untouched", async () => {
    saveObserver(ARCTIC);
    nav.search = "?tour=orion-fixture";
    const user = userEvent.setup();
    render(<Home />);

    const notice = await screen.findByText("Around Orion isn't visible from your location");
    expect(screen.queryByRole("region", { name: /tour:/i })).not.toBeInTheDocument();
    expect(canvas.props?.focus ?? null).toBeNull();
    expect(screen.getByRole("button", { name: /pause/i })).toBeEnabled();
    expect(screen.getByText(readout(TONIGHT_NOW))).toBeInTheDocument();
    expect(nav.replace).toHaveBeenCalledWith("/", { scroll: false });

    const box = notice.closest("[role=status]") as HTMLElement;
    await user.click(within(box).getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(/isn't visible from your location/)).not.toBeInTheDocument();
  });
});

describe("tour player: a second tour", () => {
  it("leaves the running tour alone when the next one isn't visible", async () => {
    const time = tourTimeFrom(TONIGHT_NOW);
    const { user, view, panel } = await openTour();
    await user.click(within(panel).getByRole("button", { name: "Next" }));

    // The visitor's location changes to one the tour can't be seen from,
    // then the tour link is opened again.
    saveObserver(ARCTIC);
    nav.search = "";
    view.rerender(<Home />);
    nav.search = "?tour=orion-fixture";
    view.rerender(<Home />);

    expect(
      await screen.findByText("Around Orion isn't visible from your location")
    ).toBeInTheDocument();
    const still = screen.getByRole("region", { name: /tour: around orion/i });
    expect(within(still).getByText("Stop 2 of 5")).toBeInTheDocument();
    expect(scrubberGroup()).toHaveAttribute("title", "Time is set by the tour. Exit to change it.");
    expect(within(scrubberGroup()).getByText(readout(time.at.getTime()))).toBeInTheDocument();
    await user.click(within(still).getByRole("button", { name: "Exit" }));
    expect(within(still).getByRole("button", { name: "Return to now" })).toBeInTheDocument();
  });
});

describe("tour player: moving between stops", () => {
  it("moves focus to the panel when the tour starts", async () => {
    const { panel } = await openTour();
    expect(panel).toHaveFocus();
  });

  it("keeps a tour popup open when the panel itself is clicked", async () => {
    const { user, panel } = await openTour();
    await user.click(within(panel).getByRole("button", { name: "Next" }));
    await user.click(within(panel).getByRole("heading", { name: "Betelgeuse" }));
    expect(screen.getByRole("dialog", { name: "Betelgeuse" })).toBeInTheDocument();
  });

  it("moves with Next and Back", async () => {
    const { user, panel } = await openTour();
    const back = within(panel).getByRole("button", { name: "Back" });
    expect(back).toBeDisabled();

    await user.click(within(panel).getByRole("button", { name: "Next" }));
    expect(within(panel).getByRole("heading", { name: "Betelgeuse" })).toBeInTheDocument();
    expect(within(panel).getByText("Stop 2 of 5")).toBeInTheDocument();
    expect(canvas.props?.focus).toMatchObject({ kind: "star", id: 2061 });

    await user.click(within(panel).getByRole("button", { name: "Back" }));
    expect(within(panel).getByRole("heading", { name: "Orion, the Hunter" })).toBeInTheDocument();
  });

  it("moves with the arrow keys, and not while typing in a field", async () => {
    const { user, panel } = await openTour();
    await user.keyboard("{ArrowRight}");
    expect(within(panel).getByText("Stop 2 of 5")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(within(panel).getByText("Stop 3 of 5")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(within(panel).getByText("Stop 2 of 5")).toBeInTheDocument();

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    await user.keyboard("{ArrowRight}");
    expect(within(panel).getByText("Stop 2 of 5")).toBeInTheDocument();
    input.remove();
  });

  it("renders the stop body as markdown", async () => {
    const { panel } = await openTour();
    const belt = within(panel).getByText("Belt");
    expect(belt.tagName).toBe("STRONG");
  });

  it("links a constellation stop to its lesson, with no popup", async () => {
    const { panel } = await openTour();
    expect(within(panel).getByRole("link", { name: /read the full lesson/i })).toHaveAttribute(
      "href",
      "/constellations/orion"
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the star popup at a star stop, and the Messier popup at a Messier stop", async () => {
    const { user, panel } = await openTour();
    await user.click(within(panel).getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "Betelgeuse" })).toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: /read the full lesson/i })).not.toBeInTheDocument();

    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(within(panel).getByText("Stop 5 of 5")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Orion Nebula" })).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "Rigel" })).toBeInTheDocument();
  });

  it("signs in from a tour popup back to the tour", async () => {
    const { user, panel } = await openTour();
    await user.click(within(panel).getByRole("button", { name: "Next" }));
    const link = await screen.findByRole("link", { name: /sign in to favorite this star/i });
    expect(link).toHaveAttribute("href", "/login?returnTo=%2F%3Ftour%3Dorion-fixture");
  });

  it("lets Esc close an open popup before it exits the tour", async () => {
    const { user, panel } = await openTour();
    await user.click(within(panel).getByRole("button", { name: "Next" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Betelgeuse" })).not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /stay here/i })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(within(panel).getByRole("button", { name: /stay here/i })).toBeInTheDocument();
  });
});

describe("tour player: the scrubber", () => {
  it("is disabled during a tour, shows the tour time and says why", async () => {
    const time = tourTimeFrom(TONIGHT_NOW);
    await openTour();
    const group = scrubberGroup();
    expect(within(group).getByRole("button", { name: /play/i })).toBeDisabled();
    expect(within(group).getByLabelText(/pick date and time/i)).toBeDisabled();
    expect(group).toHaveAttribute("title", "Time is set by the tour. Exit to change it.");
    expect(within(group).getByText(readout(time.at.getTime()))).toBeInTheDocument();
  });
});

describe("tour player: leaving", () => {
  it("offers Return or Stay on Exit, and on Esc", async () => {
    const { user, panel } = await openTour();
    await user.click(within(panel).getByRole("button", { name: "Exit" }));
    expect(within(panel).getByRole("button", { name: "Return to now" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Stay here" })).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: /back to the tour/i }));
    expect(within(panel).getByText("Stop 1 of 5")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(within(panel).getByRole("button", { name: "Stay here" })).toBeInTheDocument();
  });

  it("offers the same choice after the last stop", async () => {
    const { user, panel } = await openTour();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
    await user.click(within(panel).getByRole("button", { name: "Finish" }));
    expect(within(panel).getByText(/end of the tour/i)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Stay here" })).toBeInTheDocument();
  });

  it("Return brings a live map back live, with the clock advanced during the tour", async () => {
    const { user, panel } = await openTour();
    advance(25 * MINUTE);
    await user.click(within(panel).getByRole("button", { name: "Exit" }));
    await user.click(within(panel).getByRole("button", { name: "Return to now" }));

    expect(screen.queryByRole("region", { name: /tour:/i })).not.toBeInTheDocument();
    const group = scrubberGroup();
    expect(within(group).getByRole("button", { name: /pause/i })).toBeEnabled();
    expect(within(group).getByRole("radio", { name: "1×" })).toHaveAttribute("aria-checked", "true");
    expect((canvas.props?.when as Date).getTime()).toBe(TONIGHT_NOW + 25 * MINUTE);
    expect(group).not.toHaveAttribute("title");
  });

  it("Return restores a paused map's speed and offset from real time", async () => {
    nav.search = "";
    const user = userEvent.setup();
    const { rerender } = render(<Home />);
    await user.click(screen.getByRole("radio", { name: "60×" }));
    await user.click(screen.getByRole("button", { name: /pause/i }));
    const before = new Date(2027, 0, 12, 21, 0);
    fireEvent.change(screen.getByLabelText(/pick date and time/i), {
      target: { value: "2027-01-12T21:00:00" },
    });
    expect(screen.getByText(readout(before.getTime()))).toBeInTheDocument();

    // A tour started mid-session, as the tours list will.
    nav.search = "?tour=orion-fixture";
    rerender(<Home />);
    const panel = await screen.findByRole("region", { name: /tour: around orion/i });
    advance(10 * MINUTE);
    await user.click(within(panel).getByRole("button", { name: "Exit" }));
    await user.click(within(panel).getByRole("button", { name: "Return to Jan 12, 9:10pm" }));

    const group = scrubberGroup();
    expect(within(group).getByRole("button", { name: /play/i })).toBeEnabled();
    expect(within(group).getByRole("radio", { name: "60×" })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByText(readout(before.getTime() + 10 * MINUTE))).toBeInTheDocument();
  });

  it("Stay keeps the tour time and gives the scrubber back", async () => {
    const time = tourTimeFrom(TONIGHT_NOW);
    const { user, panel } = await openTour();
    advance(25 * MINUTE);
    await user.click(within(panel).getByRole("button", { name: "Exit" }));
    await user.click(within(panel).getByRole("button", { name: "Stay here" }));

    expect(screen.queryByRole("region", { name: /tour:/i })).not.toBeInTheDocument();
    const group = scrubberGroup();
    expect(within(group).getByRole("button", { name: /play/i })).toBeEnabled();
    expect(within(group).getByText(readout(time.at.getTime()))).toBeInTheDocument();
  });

  it.each(["Return to now", "Stay here"])(
    "%s zooms back out and removes ?tour= from the URL with a replace",
    async (choice) => {
      const { user, panel } = await openTour("?tour=orion-fixture&foo=1");
      await user.click(within(panel).getByRole("button", { name: "Next" }));
      await user.click(within(panel).getByRole("button", { name: "Exit" }));
      await user.click(within(panel).getByRole("button", { name: choice }));
      expect(nav.replace).toHaveBeenCalledTimes(1);
      expect(nav.replace).toHaveBeenCalledWith("/?foo=1", { scroll: false });
      expect(canvas.props?.focus ?? null).toBeNull();
      expect(screen.queryByRole("dialog", { name: "Betelgeuse" })).not.toBeInTheDocument();
    }
  );
});

describe("tour player: the observer", () => {
  it("is never modified by a tour", async () => {
    const home = { lat: 30.27, lng: -97.74, zip: "78701", label: "Austin, TX 78701" };
    saveObserver(home);
    const stored = window.localStorage.getItem(OBSERVER_KEY);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const { user, panel } = await openTour();
    expect(canvas.props?.observer).toEqual(home);
    await user.keyboard("{ArrowRight}{ArrowRight}");
    await user.click(within(panel).getByRole("button", { name: "Exit" }));
    await user.click(within(panel).getByRole("button", { name: "Return to now" }));

    expect(canvas.props?.observer).toEqual(home);
    expect(window.localStorage.getItem(OBSERVER_KEY)).toBe(stored);
    expect(setItem).not.toHaveBeenCalledWith(OBSERVER_KEY, expect.anything());
    // Tours write nothing to the database: no server mutation ran.
    expect(actions.toggleFavorite).not.toHaveBeenCalled();
    expect(actions.toggleViewed).not.toHaveBeenCalled();
    expect(actions.toggleRead).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe("tours list on the map", () => {
  it("lists the tour with its tour time from the visitor, linking to /?tour=", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Tours" }));
    const list = await screen.findByRole("list", { name: "Tours" });
    const item = within(list)
      .getAllByRole("listitem")
      .find((li) => within(li).queryByRole("heading", { name: TOUR.title }));
    expect(item).toBeDefined();
    const time = tourTimeFrom(TONIGHT_NOW);
    expect(item).toHaveTextContent(`Next: Tonight ${formatClock(time.at)}`);
    expect(within(item!).getByRole("link")).toHaveAttribute("href", "/?tour=orion-fixture");
  });

  it("finds tour times for the saved observer, not the default", async () => {
    saveObserver(ARCTIC);
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Tours" }));
    const list = await screen.findByRole("list", { name: "Tours" });
    expect(within(list).getByText("Not visible from your location")).toBeInTheDocument();
    expect(within(list).queryByRole("link")).not.toBeInTheDocument();
  });

  it("closes on Esc without leaving a running tour", async () => {
    const { user, panel } = await openTour();
    await user.click(screen.getByRole("button", { name: "Tours" }));
    await screen.findByRole("list", { name: "Tours" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("list", { name: "Tours" })).not.toBeInTheDocument();
    expect(within(panel).getByText("Stop 1 of 5")).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Stay here" })).not.toBeInTheDocument();
  });
});
