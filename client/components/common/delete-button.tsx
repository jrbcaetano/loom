"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

export function DeleteButton({ endpoint, redirectTo, label = "Delete" }: { endpoint: string; redirectTo: string; label?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) return;
    setErrorText(null);
    setIsLoading(true);

    const response = await fetch(endpoint, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setErrorText(payload?.error ?? t("common.deleteError", "Failed to delete"));
      setIsLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="loom-stack-xs">
      <button type="button" className="loom-button-ghost" onClick={onDelete} disabled={isLoading}>
        {isLoading ? t("common.deleting", "Deleting...") : label}
      </button>
      {errorText ? <p className="loom-feedback-error">{errorText}</p> : null}
    </div>
  );
}
