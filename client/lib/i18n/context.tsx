"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { Dictionary } from "./dictionaries";
import type { AppLocale } from "./config";
import { tryGetValueByPath } from "./translate";

type I18nContextValue = {
  locale: AppLocale;
  dictionary: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  locale: AppLocale;
  dictionary: Dictionary;
  children: ReactNode;
};

export function I18nProvider({ locale, dictionary, children }: I18nProviderProps) {
  const value = useMemo(() => ({ locale, dictionary }), [locale, dictionary]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  const t = (key: string, fallback?: string) => tryGetValueByPath(context.dictionary, key) ?? fallback ?? key;

  return {
    locale: context.locale,
    t
  };
}
