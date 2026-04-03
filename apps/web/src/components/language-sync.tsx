"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/use-translation";

/**
 * Syncs the user's DB-stored language preference into LanguageProvider on initial mount.
 * Same pattern as ThemeSync — runs once, doesn't fight with user changes in settings.
 */
export function LanguageSync({ language }: { language: string }) {
  const { setLocale } = useTranslation();
  const applied = useRef(false);

  useEffect(() => {
    if (!applied.current && (language === "en" || language === "fr")) {
      setLocale(language);
      applied.current = true;
    }
  }, [language, setLocale]);

  return null;
}
