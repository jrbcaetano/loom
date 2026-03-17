"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { AppLocale } from "@/lib/i18n/config";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import type { DateFormatOption, TimeFormatOption } from "@/lib/regional";
import { DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from "@/lib/regional";

type RegionalSettingsFormProps = {
  locale: AppLocale;
  dateFormat: DateFormatOption;
  timeFormat: TimeFormatOption;
};

export function RegionalSettingsForm({ locale, dateFormat, timeFormat }: RegionalSettingsFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [selectedLocale, setSelectedLocale] = useState<AppLocale>(locale);
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatOption>(dateFormat);
  const [selectedTimeFormat, setSelectedTimeFormat] = useState<TimeFormatOption>(timeFormat);
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);

    startTransition(async () => {
      const localeResponse = await fetch("/api/settings/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: selectedLocale })
      });

      if (!localeResponse.ok) {
        setError(t("settings.regionalSaveError", "Failed to save regional settings"));
        return;
      }

      const regionalResponse = await fetch("/api/settings/regional", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dateFormat: selectedDateFormat,
          timeFormat: selectedTimeFormat
        })
      });

      if (!regionalResponse.ok) {
        setError(t("settings.regionalSaveError", "Failed to save regional settings"));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="loom-form-stack">
      <label className="loom-inline-field" htmlFor="regional-locale-select">
        <span className="loom-inline-field-label">{t("settings.language", "Language")}</span>
        <select
          id="regional-locale-select"
          className="loom-input"
          value={selectedLocale}
          onChange={(event) => {
            const nextLocale = event.target.value;
            if (SUPPORTED_LOCALES.includes(nextLocale as AppLocale)) {
              setSelectedLocale(nextLocale as AppLocale);
            }
          }}
          disabled={isPending}
        >
          <option value="en">{t("settings.english", "English")}</option>
          <option value="pt">{t("settings.portuguese", "Portuguese")}</option>
        </select>
      </label>

      <label className="loom-inline-field" htmlFor="regional-date-format-select">
        <span className="loom-inline-field-label">{t("settings.dateFormat", "Date format")}</span>
        <select
          id="regional-date-format-select"
          className="loom-input"
          value={selectedDateFormat}
          onChange={(event) => {
            const next = event.target.value;
            if (DATE_FORMAT_OPTIONS.includes(next as DateFormatOption)) {
              setSelectedDateFormat(next as DateFormatOption);
            }
          }}
          disabled={isPending}
        >
          <option value="locale">{t("settings.dateFormatLocale", "Use language default")}</option>
          <option value="dd_mm_yyyy">{t("settings.dateFormatDdMmYyyy", "DD/MM/YYYY")}</option>
          <option value="mm_dd_yyyy">{t("settings.dateFormatMmDdYyyy", "MM/DD/YYYY")}</option>
          <option value="yyyy_mm_dd">{t("settings.dateFormatYyyyMmDd", "YYYY-MM-DD")}</option>
        </select>
      </label>

      <label className="loom-inline-field" htmlFor="regional-time-format-select">
        <span className="loom-inline-field-label">{t("settings.timeFormat", "Time format")}</span>
        <select
          id="regional-time-format-select"
          className="loom-input"
          value={selectedTimeFormat}
          onChange={(event) => {
            const next = event.target.value;
            if (TIME_FORMAT_OPTIONS.includes(next as TimeFormatOption)) {
              setSelectedTimeFormat(next as TimeFormatOption);
            }
          }}
          disabled={isPending}
        >
          <option value="locale">{t("settings.timeFormatLocale", "Use language default")}</option>
          <option value="24h">{t("settings.timeFormat24h", "24-hour")}</option>
          <option value="12h">{t("settings.timeFormat12h", "12-hour")}</option>
        </select>
      </label>

      <button type="button" className="loom-button-primary" onClick={onSubmit} disabled={isPending}>
        {isPending ? t("common.saving", "Saving...") : t("common.saveChanges", "Save changes")}
      </button>

      {error ? <p className="loom-feedback-error">{error}</p> : null}
    </div>
  );
}
