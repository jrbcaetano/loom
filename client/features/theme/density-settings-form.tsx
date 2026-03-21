"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  DENSITY_OPTIONS,
  getDensityDescriptionKey,
  getDensityLabelKey,
  type AppDensity
} from "@/lib/theme";

type DensitySettingsFormProps = {
  density: AppDensity;
};

export function DensitySettingsForm({ density }: DensitySettingsFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [selectedDensity, setSelectedDensity] = useState<AppDensity>(density);
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/settings/density", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ density: selectedDensity })
      });

      if (!response.ok) {
        setError(t("settings.densitySaveError", "Failed to save density"));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="loom-form-stack">
      <div className="loom-density-grid" role="radiogroup" aria-label={t("settings.appearanceDensity", "Density")}>
        {DENSITY_OPTIONS.map((option) => {
          const isSelected = option === selectedDensity;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`loom-density-option${isSelected ? " is-selected" : ""}`}
              data-density-preview={option}
              onClick={() => setSelectedDensity(option)}
              disabled={isPending}
            >
              <span className="loom-density-preview" aria-hidden>
                <span className="loom-density-preview-line is-strong" />
                <span className="loom-density-preview-line" />
                <span className="loom-density-preview-line is-short" />
              </span>
              <span className="loom-theme-option-copy">
                <span className="loom-theme-option-title">{t(getDensityLabelKey(option))}</span>
                <span className="loom-theme-option-description">{t(getDensityDescriptionKey(option))}</span>
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
