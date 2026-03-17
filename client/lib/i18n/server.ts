import { getRequestLocale } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { tryGetValueByPath } from "@/lib/i18n/translate";
import { getRequestRegionalSettings } from "@/lib/regional/server";
import { resolveDateLocale } from "@/lib/date";

export async function getServerI18n() {
  const locale = await getRequestLocale();
  const regionalSettings = await getRequestRegionalSettings();
  const dictionary = getDictionary(locale);

  return {
    locale,
    regionalSettings,
    dateLocale: resolveDateLocale(locale, regionalSettings.dateFormat, regionalSettings.timeFormat),
    t: (key: string, fallback?: string) => tryGetValueByPath(dictionary, key) ?? fallback ?? key
  };
}
