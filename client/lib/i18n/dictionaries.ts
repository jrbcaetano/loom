import type { AppLocale } from "./config";
import { DEFAULT_LOCALE } from "./config";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

type Dictionary = typeof en;

const dictionaries: Record<AppLocale, Dictionary> = {
  en,
  pt
};

export function getDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export type { Dictionary };
