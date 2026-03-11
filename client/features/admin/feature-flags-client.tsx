"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { PRODUCT_FEATURE_CATALOG } from "@/lib/product-features";
import type { ProductFeatureFlag } from "@/features/admin/types";

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString();
}

export function FeatureFlagsClient() {
  const { t } = useI18n();
  const [features, setFeatures] = useState<ProductFeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  async function loadFeatures() {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch("/api/admin/features", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { features?: ProductFeatureFlag[]; error?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.features.loadError", "Failed to load feature settings"));
      setIsLoading(false);
      return;
    }

    setFeatures(payload?.features ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onToggle(featureKey: string, nextValue: boolean) {
    setServerError(null);
    setPendingKey(featureKey);

    const response = await fetch("/api/admin/features", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        featureKey,
        isEnabled: nextValue
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("admin.features.updateError", "Failed to update feature setting"));
      setPendingKey(null);
      return;
    }

    setPendingKey(null);
    await loadFeatures();
  }

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">{t("admin.features.title", "Feature availability")}</h2>
      <p className="loom-muted mt-1">
        {t(
          "admin.features.subtitle",
          "Disable modules that are not ready. Disabled modules are hidden from navigation and blocked on direct URL access."
        )}
      </p>

      {isLoading ? <p className="loom-muted mt-3">{t("common.loading", "Loading...")}</p> : null}

      {!isLoading && features.length === 0 ? (
        <p className="loom-muted mt-3">{t("admin.features.empty", "No configurable features found.")}</p>
      ) : null}

      {!isLoading && features.length > 0 ? (
        <div className="loom-stack-sm mt-3">
          {PRODUCT_FEATURE_CATALOG.map((catalogItem) => {
            const feature = features.find((item) => item.featureKey === catalogItem.key);
            if (!feature) {
              return null;
            }

            const isPending = pendingKey === feature.featureKey;
            const isEnabled = feature.isEnabled;

            return (
              <article key={feature.featureKey} className="loom-row-between border-b border-slate-100 pb-3">
                <div className="loom-stack-xs">
                  <p className="m-0 font-semibold">{t(catalogItem.labelKey, catalogItem.fallbackLabel)}</p>
                  <p className="loom-muted small m-0">
                    {t("admin.features.updatedAt", "Updated at")}: {formatDate(feature.updatedAt)}
                  </p>
                  <p className="loom-muted small m-0">
                    {t("admin.features.updatedBy", "Updated by")}: {feature.updatedByLabel ?? "N/A"}
                  </p>
                </div>
                <button
                  type="button"
                  className={`loom-button-ghost ${isEnabled ? "is-selected" : ""}`}
                  disabled={isPending}
                  onClick={() => void onToggle(feature.featureKey, !isEnabled)}
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
