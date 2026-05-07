"use client";

import { toggleFavorite, toggleViewed } from "@/app/actions/user-data";
import FavoriteButton from "./FavoriteButton";
import ToggleButton from "./ToggleButton";
import { actionRowStyle } from "./styles";

export interface ConstellationActionsProps {
  slug: string;
  isAuthenticated: boolean;
  initialFavorite: boolean;
  initialViewed: boolean;
}

/**
 * Favorite + mark-viewed affordances for a constellation page. Initial
 * pressed-state is supplied from server render so unauthenticated users
 * never trigger client-side fetches.
 */
export default function ConstellationActions({
  slug,
  isAuthenticated,
  initialFavorite,
  initialViewed,
}: ConstellationActionsProps) {
  return (
    <div style={actionRowStyle}>
      <FavoriteButton
        type="constellation"
        targetId={slug}
        initialState={
          isAuthenticated ? (initialFavorite ? "is" : "not") : "unauth"
        }
        signInHint="to favorite this constellation"
      />
      <ToggleButton
        action={() => toggleViewed(slug)}
        initialPressed={initialViewed}
        isAuthenticated={isAuthenticated}
        inactiveLabel="Mark as viewed"
        activeLabel="✓ Viewed"
        signInHint="to mark constellations as viewed"
      />
    </div>
  );
}
