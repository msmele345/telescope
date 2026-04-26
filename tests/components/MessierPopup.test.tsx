import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessierPopup from "@/components/MessierPopup";
import { getMessierById } from "@/lib/messier";

describe("<MessierPopup />", () => {
  it("renders nothing when object is null", () => {
    const { container } = render(<MessierPopup object={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders M31 (Andromeda Galaxy) with type, magnitude, constellation", () => {
    const m31 = getMessierById("M31")!;
    render(<MessierPopup object={m31} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: /Andromeda Galaxy/ })).toBeInTheDocument();
    // M31 appears as subtitle and in the Catalog field — at least once is enough.
    expect(screen.getAllByText(/M31/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/^Galaxy$/)).toBeInTheDocument();
    expect(screen.getByText("3.4")).toBeInTheDocument();
    expect(screen.getByText("Andromeda")).toBeInTheDocument();
  });

  it("links to the parent constellation page", () => {
    const m31 = getMessierById("M31")!;
    render(<MessierPopup object={m31} onClose={() => {}} />);
    const link = screen.getByRole("link", { name: /read about andromeda/i });
    expect(link).toHaveAttribute("href", "/constellations/andromeda");
  });

  it("renders M-id as title when no common name exists", () => {
    const m65 = getMessierById("M65")!;
    expect(m65.name).toBeNull();
    render(<MessierPopup object={m65} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: /^M65$/ })).toBeInTheDocument();
  });

  it("dismisses on Escape", async () => {
    const m31 = getMessierById("M31")!;
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MessierPopup object={m31} onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("close button calls onClose", async () => {
    const m31 = getMessierById("M31")!;
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MessierPopup object={m31} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
