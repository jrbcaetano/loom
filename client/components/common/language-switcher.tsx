"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/config";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

type LanguageSwitcherProps = {
  locale: AppLocale;
};

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useI18n();

  function onChange(nextLocale: string) {
    if (!SUPPORTED_LOCALES.includes(nextLocale as AppLocale)) {
      return;
    }

    startTransition(async () => {
      await fetch("/api/settings/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale })
      });
      router.refresh();
    });
  }

  return (
    <label className="loom-inline-field" htmlFor="locale-select">
      <span className="loom-inline-field-label">{t("settings.language")}</span>
      <select
        id="locale-select"
        className="loom-input"
        value={locale}
        onChange={(event) => onChange(event.target.value)}
        disabled={isPending}
      >
        <option value="en">{t("settings.english")}</option>
        <option value="pt">{t("settings.portuguese")}</option>
      </select>
    </label>
  );
}
