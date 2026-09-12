import { describe, expect, it } from "vitest";
import {
  canRequestCode,
  evaluateCodeAttempt,
  evaluateSession,
  generateCode,
  hashToken,
  CODE_LENGTH,
  CODE_REQUEST_COOLDOWN_MS,
  CODE_REQUEST_HOURLY_CAP,
  CODE_REQUEST_WINDOW_MS,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  SESSION_REFRESH_THRESHOLD_MS,
  SESSION_TTL_MS,
  type LoginCodeRow,
  type RequestHistoryRow,
  type SessionRow,
} from "@/lib/auth-policy";

const T0 = 1_700_000_000_000;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function codeRow(overrides: Partial<LoginCodeRow> = {}): LoginCodeRow {
  return {
    codeHash: hashToken("123456"),
    createdAt: T0,
    expiresAt: T0 + CODE_TTL_MS,
    attempts: 0,
    consumed: false,
    ...overrides,
  };
}

function sessionRow(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    tokenHash: hashToken("a-session-token"),
    userId: 1,
    expiresAt: T0 + SESSION_TTL_MS,
    ...overrides,
  };
}

function historyRow(createdAt: number): RequestHistoryRow {
  return { createdAt };
}

describe("generateCode", () => {
  it("produces six-character digit strings across many generations", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("preserves a leading zero through generation, hashing, and comparison", () => {
    let found: string | undefined;
    for (let i = 0; i < 500 && !found; i++) {
      const code = generateCode();
      if (code.startsWith("0")) found = code;
    }
    expect(found).toBeDefined();

    const row = codeRow({ codeHash: hashToken(found!) });
    expect(evaluateCodeAttempt(row, found!, T0)).toEqual({ status: "ok" });
  });

  it("hashes a leading-zero code differently from its numeric value", () => {
    expect(hashToken("004213")).not.toBe(hashToken("4213"));
  });
});

describe("evaluateCodeAttempt", () => {
  it("verifies a correct code inside its window", () => {
    expect(evaluateCodeAttempt(codeRow(), "123456", T0)).toEqual({ status: "ok" });
  });

  it("still verifies one millisecond before expiry", () => {
    const row = codeRow();
    expect(evaluateCodeAttempt(row, "123456", row.expiresAt - 1)).toEqual({
      status: "ok",
    });
  });

  it("fails as expired at exactly the expiry instant", () => {
    const row = codeRow();
    expect(evaluateCodeAttempt(row, "123456", row.expiresAt)).toEqual({
      status: "expired",
    });
  });

  it("fails an expired code as expired, not wrong, even when the code is wrong", () => {
    const row = codeRow();
    expect(evaluateCodeAttempt(row, "000000", row.expiresAt + 1)).toEqual({
      status: "expired",
    });
  });

  it("reports four remaining attempts after the first wrong guess", () => {
    expect(evaluateCodeAttempt(codeRow(), "999999", T0)).toEqual({
      status: "wrong",
      attemptsRemaining: 4,
    });
  });

  it("reports one remaining attempt after the fourth wrong guess", () => {
    expect(evaluateCodeAttempt(codeRow({ attempts: 3 }), "999999", T0)).toEqual({
      status: "wrong",
      attemptsRemaining: 1,
    });
  });

  it("locks on the fifth consecutive wrong attempt", () => {
    expect(evaluateCodeAttempt(codeRow({ attempts: 4 }), "999999", T0)).toEqual({
      status: "locked",
    });
  });

  it("rejects a correct submission of a locked code", () => {
    expect(evaluateCodeAttempt(codeRow({ attempts: MAX_ATTEMPTS }), "123456", T0)).toEqual(
      { status: "locked" }
    );
  });

  it("rejects a consumed code", () => {
    expect(evaluateCodeAttempt(codeRow({ consumed: true }), "123456", T0)).toEqual({
      status: "locked",
    });
  });

  it("invalidates the previous code when a new one is requested", () => {
    const earlier = codeRow({ codeHash: hashToken("111111"), consumed: true });
    const later = codeRow({ codeHash: hashToken("222222"), createdAt: T0 + 1_000 });

    expect(evaluateCodeAttempt(earlier, "111111", T0 + 2_000)).toEqual({
      status: "locked",
    });
    expect(evaluateCodeAttempt(later, "222222", T0 + 2_000)).toEqual({ status: "ok" });
  });
});

describe("evaluateSession", () => {
  it("is valid inside the window", () => {
    expect(evaluateSession(sessionRow(), T0)).toEqual({
      valid: true,
      shouldSlide: false,
    });
  });

  it("is invalid at exactly the expiry instant", () => {
    const row = sessionRow();
    expect(evaluateSession(row, row.expiresAt)).toEqual({
      valid: false,
      shouldSlide: false,
    });
  });

  it("is invalid outside the window and never slides", () => {
    expect(evaluateSession(sessionRow(), T0 + SESSION_TTL_MS + 1)).toEqual({
      valid: false,
      shouldSlide: false,
    });
  });

  it("does not slide while remaining lifetime equals the refresh threshold", () => {
    const row = sessionRow({ expiresAt: T0 + SESSION_REFRESH_THRESHOLD_MS });
    expect(evaluateSession(row, T0)).toEqual({ valid: true, shouldSlide: false });
  });

  it("slides once remaining lifetime drops below the refresh threshold", () => {
    const row = sessionRow({ expiresAt: T0 + SESSION_REFRESH_THRESHOLD_MS - 1 });
    expect(evaluateSession(row, T0)).toEqual({ valid: true, shouldSlide: true });
  });
});

describe("canRequestCode", () => {
  it("allows a first request", () => {
    expect(canRequestCode([], T0)).toBe("allowed");
  });

  it("refuses a second request inside the cooldown", () => {
    expect(canRequestCode([historyRow(T0)], T0 + MINUTE - 1)).toBe("cooldown");
  });

  it("allows a request exactly when the cooldown has elapsed", () => {
    expect(canRequestCode([historyRow(T0)], T0 + CODE_REQUEST_COOLDOWN_MS)).toBe(
      "allowed"
    );
  });

  it("allows a fifth request when only four exist inside the hour", () => {
    const rows = Array.from({ length: CODE_REQUEST_HOURLY_CAP - 1 }, (_, i) =>
      historyRow(T0 - (i + 1) * 2 * MINUTE)
    );
    expect(canRequestCode(rows, T0)).toBe("allowed");
  });

  it("refuses a sixth request inside the hour as hourlyCap", () => {
    const rows = Array.from({ length: CODE_REQUEST_HOURLY_CAP }, (_, i) =>
      historyRow(T0 - (i + 1) * MINUTE)
    );
    expect(canRequestCode(rows, T0)).toBe("hourlyCap");
  });

  it("allows a request once the oldest rows fall outside the hour", () => {
    const rows = Array.from({ length: CODE_REQUEST_HOURLY_CAP }, (_, i) =>
      historyRow(T0 - CODE_REQUEST_WINDOW_MS - i)
    );
    expect(canRequestCode(rows, T0)).toBe("allowed");
  });

  it("counts spent and expired rows toward the hourly cap", () => {
    const rows = Array.from({ length: CODE_REQUEST_HOURLY_CAP }, (_, i) => ({
      createdAt: T0 - 10 * MINUTE - (i + 1) * MINUTE,
      consumed: true,
      expiresAt: T0 - 5 * MINUTE,
    }));
    expect(canRequestCode(rows, T0)).toBe("hourlyCap");
  });
});