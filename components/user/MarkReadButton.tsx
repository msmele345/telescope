"use client";

import { toggleRead } from "@/app/actions/user-data";
import ToggleButton from "./ToggleButton";

export interface MarkReadButtonProps {
  slug: string;
  isAuthenticated: boolean;
  initialRead: boolean;
}

export default function MarkReadButton({
  slug,
  isAuthenticated,
  initialRead,
}: MarkReadButtonProps) {
  return (
    <ToggleButton
      action={() => toggleRead(slug)}
      initialPressed={initialRead}
      isAuthenticated={isAuthenticated}
      inactiveLabel="Mark lesson as read"
      activeLabel="✓ Read"
      signInHint="to track lessons you've read"
    />
  );
}
