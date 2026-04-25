import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeScrubber from "@/components/TimeScrubber";
import { TimeController } from "@/lib/time-controller";

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0); // 2026-01-01T00:00:00Z

function mkController(start = T0) {
  let t = start;
  const controller = new TimeController({ now: () => t });
  return {
    controller,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

// Keep the RAF loop quiet in tests — immediate callback would cause runaway updates.
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (_cb: FrameRequestCallback) => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<TimeScrubber />", () => {
  it("shows play when paused and pause glyph when running", async () => {
    const user = userEvent.setup();
    const { controller } = mkController();
    render(<TimeScrubber controller={controller} />);

    // Default state is running → pause control visible
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /pause/i }));
    expect(controller.snapshot().mode).toBe("paused");
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /play/i }));
    expect(controller.snapshot().mode).toBe("running");
  });

  it("selects speed via radio buttons and updates controller", async () => {
    const user = userEvent.setup();
    const { controller } = mkController();
    render(<TimeScrubber controller={controller} />);

    const sixty = screen.getByRole("radio", { name: /60×/ });
    expect(sixty).toHaveAttribute("aria-checked", "false");

    await user.click(sixty);
    expect(controller.snapshot().speed).toBe(60);
    expect(screen.getByRole("radio", { name: /60×/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await user.click(screen.getByRole("radio", { name: /3600×/ }));
    expect(controller.snapshot().speed).toBe(3600);
  });

  it("date/time picker scrubs controller virtual time", async () => {
    const { controller } = mkController();
    const scrubSpy = vi.spyOn(controller, "scrubTo");
    render(<TimeScrubber controller={controller} />);

    const picker = screen.getByLabelText(/pick date and time/i) as HTMLInputElement;
    // Fire a change event directly — userEvent has quirks with datetime-local
    await act(async () => {
      const value = "2030-06-15T12:30:00";
      picker.focus();
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(picker, value);
      picker.dispatchEvent(new Event("input", { bubbles: true }));
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(scrubSpy).toHaveBeenCalled();
    const last = scrubSpy.mock.calls.at(-1)?.[0] as number;
    expect(last).toBe(new Date("2030-06-15T12:30:00").getTime());
  });

  it("Now button resets controller virtual time to real-now", async () => {
    const user = userEvent.setup();
    const { controller, advance } = mkController();
    controller.scrubTo(T0 + 86_400_000); // jump a day ahead
    advance(5_000);

    render(<TimeScrubber controller={controller} />);
    await user.click(screen.getByRole("button", { name: /reset to now/i }));

    expect(controller.getVirtualMs()).toBe(T0 + 5_000);
  });

  it("pause freezes the readout at the paused instant", async () => {
    const user = userEvent.setup();
    const { controller, advance } = mkController();
    controller.setSpeed(60);
    render(<TimeScrubber controller={controller} />);

    advance(1_000); // +1s real → +60s virtual
    await user.click(screen.getByRole("button", { name: /pause/i }));

    const snap = controller.snapshot();
    expect(snap.mode).toBe("paused");
    expect(snap.virtualMs).toBe(T0 + 60_000);

    // advancing real time should not change virtualMs while paused
    advance(10_000);
    expect(controller.getVirtualMs()).toBe(T0 + 60_000);
  });
});
