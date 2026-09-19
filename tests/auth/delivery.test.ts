import { afterEach, describe, expect, it, vi } from "vitest";
import { CODE_TTL_MS } from "@/lib/auth-policy";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: (...args: unknown[]) => send(...args) } })),
}));

import { composeCodeEmail, deliverCode } from "@/lib/auth/delivery";

describe("composeCodeEmail", () => {
  it("is unmistakably from Telescope", () => {
    const email = composeCodeEmail("123456", CODE_TTL_MS);
    expect(email.subject).toContain("Telescope");
    expect(email.text).toContain("Telescope");
    expect(email.html).toContain("Telescope");
  });

  it("puts the code in the subject and body with its leading zero intact", () => {
    const email = composeCodeEmail("004213", CODE_TTL_MS);
    expect(email.subject).toContain("004213");
    expect(email.text).toContain("004213");
    expect(email.html).toContain("004213");
  });

  it("states how long the code is valid", () => {
    const email = composeCodeEmail("123456", CODE_TTL_MS);
    expect(email.text).toContain("10 minutes");
    expect(email.html).toContain("10 minutes");
  });

  it("derives the validity window from the lifetime it is given", () => {
    expect(composeCodeEmail("123456", 15 * 60_000).text).toContain("15 minutes");
    expect(composeCodeEmail("123456", 60_000).text).toContain("1 minute");
    expect(composeCodeEmail("123456", 60_000).text).not.toContain("1 minutes");
  });
});

describe("deliverCode without a mail provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("writes the code to the server log in development", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(deliverCode("ada@example.com", "004213")).resolves.toBeUndefined();

    const logged = log.mock.calls.flat().join(" ");
    expect(logged).toContain("ada@example.com");
    expect(logged).toContain("004213");
  });

  it("refuses in production rather than logging a live code", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(deliverCode("ada@example.com", "004213")).rejects.toThrow(/RESEND_API_KEY/);
    expect(log.mock.calls.flat().join(" ")).not.toContain("004213");
  });
});

describe("deliverCode with Resend configured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    send.mockReset();
  });

  it("emails the code to the address, from Telescope, without logging it", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    send.mockResolvedValue({ data: { id: "e1" }, error: null });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await deliverCode("ada@example.com", "004213");

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.to).toBe("ada@example.com");
    expect(payload.from).toMatch(/^Telescope </);
    expect(payload.text).toContain("004213");
    expect(payload.text).toContain("10 minutes");
    expect(log.mock.calls.flat().join(" ")).not.toContain("004213");
  });

  it("sends from EMAIL_FROM when it is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Telescope <signin@example.org>");
    send.mockResolvedValue({ data: { id: "e1" }, error: null });

    await deliverCode("ada@example.com", "123456");

    expect(send.mock.calls[0][0].from).toBe("Telescope <signin@example.org>");
  });

  it("fails loudly when Resend rejects the send, rather than logging the code", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    send.mockResolvedValue({
      data: null,
      error: { message: "You can only send testing emails to your own email address", statusCode: 403, name: "validation_error" },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(deliverCode("ada@example.com", "004213")).rejects.toThrow(/own email address/);
    expect(log.mock.calls.flat().join(" ")).not.toContain("004213");
  });
});
