export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES = ["en", "pt"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return !!value && SUPPORTED_LOCALES.includes(value as AppLocale);
}
