"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  t as translate,
  enMessages,
  frMessages,
  type Locale,
  type Messages,
} from "@bike-check/shared";

const dictionaries: Record<Locale, Messages> = {
  en: enMessages as unknown as Messages,
  fr: frMessages as unknown as Messages,
};

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("bikecheck_language");
  if (stored === "en" || stored === "fr") return stored;
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("bikecheck_language", newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const tFn = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(dictionaries[locale], key, params);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t: tFn }),
    [locale, setLocale, tFn],
  );

  // Avoid hydration mismatch: render with "en" on server, update on mount
  if (!mounted) {
    const serverValue: LanguageContextValue = {
      locale: "en",
      setLocale,
      t: (key, params) => translate(dictionaries.en, key, params),
    };
    return (
      <LanguageContext.Provider value={serverValue}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
