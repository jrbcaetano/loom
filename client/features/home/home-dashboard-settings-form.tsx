"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  HOME_WIDGET_CATALOG,
  type HomeDashboardPreferences,
  type HomeWidgetKey,
  type WeatherUnit
} from "@/features/home/dashboard";

type HomeDashboardSettingsFormProps = {
  initialDashboard: HomeDashboardPreferences;
};

function moveWidget(widgets: HomeDashboardPreferences["widgets"], key: HomeWidgetKey, direction: -1 | 1) {
  const index = widgets.findIndex((widget) => widget.key === key);
  const targetIndex = index + direction;

  if (index < 0 || targetIndex < 0 || targetIndex >= widgets.length) {
    return widgets;
  }

  const next = [...widgets];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

export function HomeDashboardSettingsForm({ initialDashboard }: HomeDashboardSettingsFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<HomeDashboardPreferences>(initialDashboard);

  const widgetsByKey = useMemo(() => new Map(dashboard.widgets.map((widget) => [widget.key, widget])), [dashboard.widgets]);
  const orderedWidgets = useMemo(
    () =>
      dashboard.widgets
        .map((widget) => ({
          widget,
          catalogItem: HOME_WIDGET_CATALOG.find((entry) => entry.key === widget.key)
        }))
        .filter((entry): entry is { widget: HomeDashboardPreferences["widgets"][number]; catalogItem: (typeof HOME_WIDGET_CATALOG)[number] } => Boolean(entry.catalogItem)),
    [dashboard.widgets]
  );

  function updateWeatherLocation(value: string) {
    setDashboard((current) => ({
      ...current,
      settings: {
        ...current.settings,
        weather: {
          location: value,
          unit: current.settings.weather?.unit ?? "celsius"
        }
      }
    }));
  }

  function updateWeatherUnit(value: WeatherUnit) {
    setDashboard((current) => ({
      ...current,
      settings: {
        ...current.settings,
        weather: {
          location: current.settings.weather?.location ?? "",
          unit: value
        }
      }
    }));
  }

  function toggleWidget(key: HomeWidgetKey) {
    setDashboard((current) => ({
      ...current,
      widgets: current.widgets.map((widget) =>
        widget.key === key
          ? {
              ...widget,
              enabled: !widget.enabled
            }
          : widget
      )
    }));
  }

  function onSubmit() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/settings/home-dashboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dashboard)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? t("settings.dashboardSaveError", "Failed to save dashboard settings"));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="loom-form-stack">
      <div className="loom-stack-sm">
        {orderedWidgets.map(({ widget, catalogItem }, index) => {

          return (
            <article key={catalogItem.key} className="loom-dashboard-widget-config">
              <div className="loom-dashboard-widget-config-copy">
                <p className="m-0 font-semibold">{t(catalogItem.labelKey, catalogItem.fallbackLabel)}</p>
                <p className="loom-muted small m-0">{t(catalogItem.descriptionKey, catalogItem.fallbackDescription)}</p>
              </div>

              <div className="loom-dashboard-widget-config-actions">
                <button
                  type="button"
                  className={`loom-button-ghost ${widget.enabled ? "is-selected" : ""}`}
                  onClick={() => toggleWidget(catalogItem.key)}
                  disabled={isPending}
                >
                  {widget.enabled ? t("common.enabled", "Enabled") : t("common.hidden", "Hidden")}
                </button>
                <button
                  type="button"
                  className="loom-button-ghost"
                  onClick={() => setDashboard((current) => ({ ...current, widgets: moveWidget(current.widgets, catalogItem.key, -1) }))}
                  disabled={isPending || index === 0}
                >
                  {t("common.moveUp", "Move up")}
                </button>
                <button
                  type="button"
                  className="loom-button-ghost"
                  onClick={() => setDashboard((current) => ({ ...current, widgets: moveWidget(current.widgets, catalogItem.key, 1) }))}
                  disabled={isPending || index === dashboard.widgets.length - 1}
                >
                  {t("common.moveDown", "Move down")}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="loom-dashboard-widget-settings">
        <h3 className="loom-section-title">{t("settings.weatherWidget", "Weather widget")}</h3>
        <p className="loom-muted small mt-2 mb-0">
          {t("settings.weatherWidgetHint", "Choose the place and temperature unit used by your weather card.")}
        </p>
        <div className="loom-form-stack mt-3">
          <label className="loom-inline-field" htmlFor="home-weather-location">
            <span className="loom-inline-field-label">{t("settings.weatherLocation", "Location")}</span>
            <input
              id="home-weather-location"
              className="loom-input"
              value={dashboard.settings.weather?.location ?? ""}
              onChange={(event) => updateWeatherLocation(event.target.value)}
              disabled={isPending}
              placeholder={t("settings.weatherLocationPlaceholder", "Leave blank to use your current area")}
            />
          </label>

          <label className="loom-inline-field" htmlFor="home-weather-unit">
            <span className="loom-inline-field-label">{t("settings.weatherUnit", "Temperature unit")}</span>
            <select
              id="home-weather-unit"
              className="loom-input"
              value={dashboard.settings.weather?.unit ?? "celsius"}
              onChange={(event) => updateWeatherUnit(event.target.value === "fahrenheit" ? "fahrenheit" : "celsius")}
              disabled={isPending}
            >
              <option value="celsius">{t("settings.celsius", "Celsius")}</option>
              <option value="fahrenheit">{t("settings.fahrenheit", "Fahrenheit")}</option>
            </select>
          </label>
        </div>
      </div>

      <button type="button" className="loom-button-primary" onClick={onSubmit} disabled={isPending}>
        {isPending ? t("common.saving", "Saving...") : t("common.saveChanges", "Save changes")}
      </button>

      {error ? <p className="loom-feedback-error">{error}</p> : null}
    </div>
  );
}
