"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/lib/query/query-provider";
import { I18nProvider } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { AppLocale } from "@/lib/i18n/config";

type AppProvidersProps = {
  locale: AppLocale;
  dictionary: Dictionary;
  children: ReactNode;
};

export function AppProviders({ locale, dictionary, children }: AppProvidersProps) {
  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <QueryProvider>{children}</QueryProvider>
    </I18nProvider>
  );
}
