import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlanetPopup from "@/components/PlanetPopup";
import type { SolarBody } from "@/lib/solar-system";

const MARS: SolarBody = {
  id: "mars",
  name: "Mars",
  kind: "planet",
  ra: 3.14,
  dec: 0.34,
  mag: 1.2,
  distAU: 0.85,
};

const MOON: SolarBody = {
  id: "moon",
  name: "Moon",
  kind: "moon",
  ra: 1.0,
  dec: 0.2,
  mag: -10.5,
  distAU: 0.00257,
};

const SUN: SolarBody = {
  id: "sun",
  name: "Sun",
  kind: "sun",
  ra: 4.91,
  dec: -0.4,
  mag: -26.74,
  distAU: 0.983,
};

describe("<PlanetPopup />", () => {
  it("renders nothing when body is null", () => {
    const { container } = render(<PlanetPopup body={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Mars with magnitude and AU distance", () => {
    render(<PlanetPopup body={MARS} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: /Mars/ })).toBeInTheDocument();
    expect(screen.getByText("1.20")).toBeInTheDocument();
    expect(screen.getByText("0.850 AU")).toBeInTheDocument();
    // Type rendered as planet
    expect(screen.getAllByText(/Planet/).length).toBeGreaterThan(0);
  });

  it("renders the Moon with km distance", () => {
    render(<PlanetPopup body={MOON} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: /Moon/ })).toBeInTheDocument();
    // ~384,400 km — assert we render kilometers, not AU
    expect(screen.getByText(/km$/)).toBeInTheDocument();
    expect(screen.queryByText(/AU/)).not.toBeInTheDocument();
  });

  it("labels the Sun as a star", () => {
    render(<PlanetPopup body={SUN} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: /Sun/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Star \(Sun\)/).length).toBeGreaterThan(0);
  });

  it("dismisses on Escape key", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PlanetPopup body={MARS} onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("close button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PlanetPopup body={MARS} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
