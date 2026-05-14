"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addFavorite,
  isFavorite,
  isRead,
  isViewed,
  markRead,
  markViewed,
  removeFavorite,
  unmarkRead,
  unmarkViewed,
  type FavoriteType,
} from "@/lib/user-data";
import { getConstellationBySlug } from "@/lib/constellation";

export type ToggleResult =
  | { status: "added" | "removed" }
  | { status: "unauth" | "invalid" };

export type StateResult =
  | { status: "is" | "not" }
  | { status: "unauth" | "invalid" };

export async function getFavoriteState(
  type: FavoriteType,
  targetId: string
): Promise<StateResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "unauth" };
  if (!validateTarget(type, targetId)) return { status: "invalid" };
  const flag = await isFavorite(session.user.id, type, targetId);
  return { status: flag ? "is" : "not" };
}

function isValidStarId(targetId: string): boolean {
  return /^\d{1,6}$/.test(targetId);
}

function isValidConstellationSlug(slug: string): boolean {
  return getConstellationBySlug(slug) !== undefined;
}

function validateTarget(type: FavoriteType, targetId: string): boolean {
  return type === "star"
    ? isValidStarId(targetId)
    : isValidConstellationSlug(targetId);
}

export async function toggleFavorite(
  type: FavoriteType,
  targetId: string
): Promise<ToggleResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "unauth" };
  if (!validateTarget(type, targetId)) return { status: "invalid" };

  const userId = session.user.id;
  const already = await isFavorite(userId, type, targetId);
  if (already) {
    await removeFavorite(userId, type, targetId);
    if (type === "constellation") revalidatePath(`/constellations/${targetId}`);
    return { status: "removed" };
  }
  await addFavorite(userId, type, targetId);
  if (type === "constellation") revalidatePath(`/constellations/${targetId}`);
  return { status: "added" };
}

export async function toggleViewed(slug: string): Promise<ToggleResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "unauth" };
  if (!isValidConstellationSlug(slug)) return { status: "invalid" };

  const userId = session.user.id;
  const already = await isViewed(userId, slug);
  if (already) {
    await unmarkViewed(userId, slug);
    revalidatePath(`/constellations/${slug}`);
    return { status: "removed" };
  }
  await markViewed(userId, slug);
  revalidatePath(`/constellations/${slug}`);
  return { status: "added" };
}

export async function toggleRead(slug: string): Promise<ToggleResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "unauth" };
  if (!isValidConstellationSlug(slug)) return { status: "invalid" };

  const userId = session.user.id;
  const already = await isRead(userId, slug);
  if (already) {
    await unmarkRead(userId, slug);
    revalidatePath(`/constellations/${slug}`);
    return { status: "removed" };
  }
  await markRead(userId, slug);
  revalidatePath(`/constellations/${slug}`);
  return { status: "added" };
}
