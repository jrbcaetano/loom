import { formatDistanceToNowStrict } from "date-fns";
import { enGB, pt } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { AppLocale } from "@/lib/i18n/config";
import type { DateFormatOption, TimeFormatOption } from "@/lib/regional";

function baseLocaleByPreference(locale?: AppLocale | string, dateFormat: DateFormatOption = "locale") {
  if (dateFormat === "dd_mm_yyyy") return locale === "pt" ? "pt-PT" : "en-GB";
  if (dateFormat === "mm_dd_yyyy") return "en-US";
  if (dateFormat === "yyyy_mm_dd") return "sv-SE";
  if (locale === "pt") return "pt-PT";

  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }

  return "en-GB";
}

export function resolveDateLocale(locale?: AppLocale | string, dateFormat: DateFormatOption = "locale", timeFormat: TimeFormatOption = "locale") {
  const base = baseLocaleByPreference(locale, dateFormat);

  if (timeFormat === "24h") return `${base}-u-hc-h23`;
  if (timeFormat === "12h") return `${base}-u-hc-h12`;
  return base;
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
