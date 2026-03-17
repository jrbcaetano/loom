"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { PushEventFlag } from "@/features/admin/types";
import { PUSH_EVENT_CATALOG } from "@/features/push/catalog";

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString(locale);
}

export function PushEventsClient() {
  const { t, dateLocale } = useI18n();
  const [events, setEvents] = useState<PushEventFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  async function loadEvents() {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/admin/push-events", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { events?: PushEventFlag[]; error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.pushEvents.loadError", "Failed to load push event settings"));
      setIsLoading(false);
      return;
    }

    setEvents(payload?.events ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onToggle(eventKey: string, nextValue: boolean) {
    setServerError(null);
    setPendingKey(eventKey);

    const response = await fetch("/api/admin/push-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventKey,
        isEnabled: nextValue
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.pushEvents.updateError", "Failed to update push event setting"));
      setPendingKey(null);
      return;
    }

    setPendingKey(null);
    await loadEvents();
  }

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">{t("admin.pushEvents.title", "Push event settings")}</h2>
      <p className="loom-muted mt-1">
        {t(
          "admin.pushEvents.subtitle",
          "Control which events can trigger push notifications across the app."
        )}
      </p>

      {isLoading ? <p className="loom-muted mt-3">{t("common.loading", "Loading...")}</p> : null}

      {!isLoading && events.length === 0 ? (
        <p className="loom-muted mt-3">{t("admin.pushEvents.empty", "No configurable push events found.")}</p>
      ) : null}

      {!isLoading && events.length > 0 ? (
        <div className="loom-stack-sm mt-3">
          {PUSH_EVENT_CATALOG.map((catalogItem) => {
            const eventItem = events.find((item) => item.eventKey === catalogItem.key);
            if (!eventItem) {
              return null;
            }

            const isPending = pendingKey === eventItem.eventKey;
            const isEnabled = eventItem.isEnabled;

            return (
              <article key={eventItem.eventKey} className="loom-row-between border-b border-slate-100 pb-3">
                <div className="loom-stack-xs">
                  <p className="m-0 font-semibold">{t(catalogItem.labelKey, catalogItem.fallbackLabel)}</p>
                  <p className="loom-muted small m-0">
                    {t("admin.features.updatedAt", "Updated at")}: {formatDate(eventItem.updatedAt, dateLocale)}
                  </p>
                  <p className="loom-muted small m-0">
                    {t("admin.features.updatedBy", "Updated by")}: {eventItem.updatedByLabel ?? "N/A"}
                  </p>
                </div>
                <button
                  type="button"
                  className={`loom-button-ghost ${isEnabled ? "is-selected" : ""}`}
                  disabled={isPending}
                  onClick={() => void onToggle(eventItem.eventKey, !isEnabled)}
                >
                  {isPending
                    ? t("admin.features.updating", "Updating...")
                    : isEnabled
                      ? t("admin.features.statusEnabled", "Enabled")
                      : t("admin.features.statusDisabled", "Disabled")}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {serverError ? <p className="loom-feedback-error mt-3">{serverError}</p> : null}
    </section>
  );
}
