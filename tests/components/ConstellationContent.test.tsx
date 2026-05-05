import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConstellationContent from "@/components/ConstellationContent";
import type { ConstellationMembers } from "@/lib/constellation/server";

const orionMembers: ConstellationMembers = {
  count: 78,
  meanRA: 1.45,
  meanDec: 0.05,
  brightest: [
    {
      id: 1713,
      ra: 1.37,
      dec: -0.14,
      mag: 0.12,
      name: "Rigel",
      bayer: "β",
      constellation: "Ori",
      distLy: 251,
    },
    {
      id: 2061,
      ra: 1.55,
      dec: 0.13,
      mag: 0.5,
      name: "Betelgeuse",
      bayer: "α",
      constellation: "Ori",
      distLy: 652,
    },
  ],
};

describe("<ConstellationContent>", () => {
  it("renders the authored lesson when one is provided", () => {
    render(
      <ConstellationContent
        name="Orion"
        lesson={<p data-testid="lesson-body">The hunter strides across the sky.</p>}
        members={null}
      />
    );

    expect(screen.getByTestId("lesson-body")).toBeInTheDocument();
    // Coming-soon copy should not appear.
    expect(screen.queryByText(/coming soon\.?/i)).not.toBeInTheDocument();
  });

  it("renders coming-soon stub with sky position and brightest stars", () => {
    render(
      <ConstellationContent name="Orion" lesson={null} members={orionMembers} />
    );

    expect(screen.getByText(/coming soon\.?/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /sky position/i })).toBeInTheDocument();
    expect(screen.getByText("Right ascension")).toBeInTheDocument();
    expect(screen.getByText("Declination")).toBeInTheDocument();

    expect(screen.getByRole("region", { name: /brightest stars/i })).toBeInTheDocument();
    expect(screen.getByText("Rigel")).toBeInTheDocument();
    expect(screen.getByText("Betelgeuse")).toBeInTheDocument();
    // Magnitude formatting (two decimals).
    expect(screen.getByText(/mag 0\.12/)).toBeInTheDocument();
    // Distance formatting.
    expect(screen.getByText(/251 ly/)).toBeInTheDocument();
  });

  it("renders a minimal coming-soon when no member data is available", () => {
    render(<ConstellationContent name="Antlia" lesson={null} members={null} />);

    expect(screen.getByText(/coming soon\.?/i)).toBeInTheDocument();
    expect(screen.queryByText(/Right ascension/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Brightest stars/i)).not.toBeInTheDocument();
  });
});
