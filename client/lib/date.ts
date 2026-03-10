import { formatDistanceToNowStrict } from "date-fns";
import { enGB, pt } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { AppLocale } from "@/lib/i18n/config";

export function resolveDateLocale(locale?: AppLocale | string) {
  if (locale === "pt") {
    return "pt-PT";
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }

  return "en-GB";
}

export function resolveDateFnsLocale(locale?: AppLocale | string): Locale {
  if (locale === "pt") {
    return pt;
  }

  return enGB;
}

export function formatRelativeDate(dateIso: string, locale?: AppLocale | string) {
  return formatDistanceToNowStrict(new Date(dateIso), {
    addSuffix: true,
    locale: resolveDateFnsLocale(locale)
  });
}
