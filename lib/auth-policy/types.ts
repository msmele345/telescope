export type CodeAttemptResult =
  | { status: "ok" }
  | { status: "expired" }
  | { status: "wrong"; attemptsRemaining: number }
  | { status: "locked"; countsAsAttempt: boolean };

export type CodeRequestResult = "allowed" | "cooldown" | "hourlyCap";

export interface LoginCodeRow {
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
}

export interface RequestHistoryRow {
  createdAt: number;
  consumed?: boolean;
  expiresAt?: number;
}

export interface SessionRow {
  tokenHash: string;
  userId: number;
  expiresAt: number;
}

export interface SessionEvaluation {
  valid: boolean;
  shouldSlide: boolean;
}
