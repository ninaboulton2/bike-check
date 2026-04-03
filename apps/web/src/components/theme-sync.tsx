"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Syncs the user's DB-stored theme preference into next-themes on initial mount only.
 * Does not re-run on subsequent renders so it won't fight with user changes in settings.
 */
export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  useEffect(() => {
    if (!applied.current && theme) {
      setTheme(theme);
      applied.current = true;
    }
  }, [theme, setTheme]);

  return null;
}
