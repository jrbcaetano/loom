"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  THEME_OPTIONS,
  getThemeDescriptionKey,
  getThemeLabelKey,
  type AppTheme
} from "@/lib/theme";

type ThemeSettingsFormProps = {
  theme: AppTheme;
};

export function ThemeSettingsForm({ theme }: ThemeSettingsFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(theme);
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/settings/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: selectedTheme })
      });

      if (!response.ok) {
        setError(t("settings.themeSaveError", "Failed to save theme"));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="loom-form-stack">
      <div className="loom-theme-grid" role="radiogroup" aria-label={t("settings.appearanceTheme", "Theme")}>
        {THEME_OPTIONS.map((option) => {
          const isSelected = option === selectedTheme;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`loom-theme-option${isSelected ? " is-selected" : ""}`}
              data-theme-preview={option}
              onClick={() => setSelectedTheme(option)}
              disabled={isPending}
            >
              <span className="loom-theme-preview" aria-hidden>
                <span className="loom-theme-preview-top" />
                <span className="loom-theme-preview-body">
                  <span className="loom-theme-preview-sidebar" />
                  <span className="loom-theme-preview-card-stack">
                    <span className="loom-theme-preview-card is-lg" />
                    <span className="loom-theme-preview-card" />
                  </span>
                </span>
              </span>
              <span className="loom-theme-option-copy">
                <span className="loom-theme-option-title">{t(getThemeLabelKey(option))}</span>
                <span className="loom-theme-option-description">{t(getThemeDescriptionKey(option))}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" className="loom-button-primary" onClick={onSubmit} disabled={isPending}>
        {isPending ? t("common.saving", "Saving...") : t("common.saveChanges", "Save changes")}
      </button>

      {error ? <p className="loom-feedback-error">{error}</p> : null}
    </div>
  );
}
