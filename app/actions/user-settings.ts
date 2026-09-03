"use server";

import { auth } from "@/auth";
import {
  getUserSettings,
  upsertUserSettings,
} from "@/lib/user-settings";
import type { SavedObserver } from "@/lib/observer";

export async function saveObserverIfMissing(
  observer: SavedObserver
): Promise<{ status: "saved" | "exists" | "unauth" }> {
  const session = await auth();
  if (!session?.user?.id) return { status: "unauth" };

  const existing = await getUserSettings(session.user.id);
  if (existing && existing.lat !== null && existing.lng !== null) {
    return { status: "exists" };
  }

  await upsertUserSettings(session.user.id, observer);
  return { status: "saved" };
}
