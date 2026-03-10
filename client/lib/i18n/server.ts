import { getRequestLocale } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { tryGetValueByPath } from "@/lib/i18n/translate";

export async function getServerI18n() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return {
    locale,
    t: (key: string, fallback?: string) => tryGetValueByPath(dictionary, key) ?? fallback ?? key
  };
}
