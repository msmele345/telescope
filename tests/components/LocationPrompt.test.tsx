import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LocationPrompt from "@/components/LocationPrompt";
import type { ZipLocation } from "@/lib/zip-geocoder";

const minneapolis: ZipLocation = {
  zip: "55401",
  lat: 44.9833,
  lng: -93.2706,
  city: "Minneapolis",
  state: "MN",
};

function fakeResolver(hit?: ZipLocation) {
  return vi.fn(async (zip: string) => (zip.startsWith("55401") ? hit ?? null : null));
}

describe("<LocationPrompt />", () => {
  it("shows the 'set' banner when no observer is set", () => {
    render(<LocationPrompt onResolve={() => {}} />);
    expect(screen.getByRole("button", { name: /set your location/i })).toBeInTheDocument();
  });

  it("shows the resolved label when an observer is set", () => {
    render(
      <LocationPrompt
        observer={{ lat: 44.98, lng: -93.27, label: "Minneapolis, MN 55401" }}
        onResolve={() => {}}
      />
    );
    expect(screen.getByText(/Minneapolis, MN 55401/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change location/i })).toBeInTheDocument();
  });

  it("opens the modal and resolves a valid zipcode", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(<LocationPrompt onResolve={onResolve} resolveZip={fakeResolver(minneapolis)} />);

    await user.click(screen.getByRole("button", { name: /set your location/i }));
    const input = screen.getByRole("textbox", { name: /US zipcode/i });
    await user.type(input, "55401");
    await user.click(screen.getByRole("button", { name: /set location/i }));

    await waitFor(() => {
      expect(onResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          zip: "55401",
          lat: minneapolis.lat,
          lng: minneapolis.lng,
          label: "Minneapolis, MN 55401",
        })
      );
    });
  });

  it("surfaces an error for malformed input", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(<LocationPrompt onResolve={onResolve} resolveZip={fakeResolver(minneapolis)} />);

    await user.click(screen.getByRole("button", { name: /set your location/i }));
    await user.type(screen.getByRole("textbox", { name: /US zipcode/i }), "abc");
    await user.click(screen.getByRole("button", { name: /set location/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/5-digit US zipcode/);
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("surfaces an error for an unknown zipcode", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(<LocationPrompt onResolve={onResolve} resolveZip={fakeResolver()} />);

    await user.click(screen.getByRole("button", { name: /set your location/i }));
    await user.type(screen.getByRole("textbox", { name: /US zipcode/i }), "99999");
    await user.click(screen.getByRole("button", { name: /set location/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/don't have that zipcode/i);
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("closes the modal on Escape", async () => {
    const user = userEvent.setup();
    render(<LocationPrompt onResolve={() => {}} resolveZip={fakeResolver(minneapolis)} />);

    await user.click(screen.getByRole("button", { name: /set your location/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
