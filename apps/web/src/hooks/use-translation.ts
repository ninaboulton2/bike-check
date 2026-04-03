"use client";

import { useContext } from "react";
import { LanguageContext, type LanguageContextValue } from "@/components/language-provider";

export function useTranslation(): LanguageContextValue {
  return useContext(LanguageContext);
}
