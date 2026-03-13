"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type SupportState = "checking" | "supported" | "unsupported";

export function PushSettingsClient() {
  const { t } = useI18n();
  const [supportState, setSupportState] = useState<SupportState>("checking");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const supportMessage = useMemo(() => {
    if (supportState === "unsupported") {
      return t("settings.pushUnsupported", "Push notifications are not supported on this browser/device.");
    }

    if (permission === "denied") {
      return t(
        "settings.pushPermissionDenied",
        "Notification permission is blocked. Enable it in your browser/site settings."
      );
    }

    if (isSubscribed) {
      return t("settings.pushEnabled", "Push notifications are enabled on this device.");
    }

    return t("settings.pushDisabled", "Push notifications are currently disabled.");
  }, [isSubscribed, permission, supportState, t]);

  useEffect(() => {
    async function loadStatus() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setSupportState("unsupported");
        return;
      }

      setPermission(Notification.permission);
      setSupportState("supported");

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(subscription));
      } catch {
        setIsSubscribed(false);
      }
    }

    void loadStatus();
  }, []);

  async function enablePush() {
    if (supportState !== "supported") return;

    setIsPending(true);
    setServerError(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        return;
      }

      const keyResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyPayload = (await keyResponse.json()) as { publicKey?: string; error?: string };
      if (!keyResponse.ok || !keyPayload.publicKey) {
        throw new Error(keyPayload.error ?? t("settings.pushKeyLoadError", "Push configuration is unavailable."));
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey)
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON())
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("settings.pushSubscribeError", "Failed to enable push notifications."));
      }

      setIsSubscribed(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : t("settings.pushSubscribeError", "Failed to enable push notifications."));
    } finally {
      setIsPending(false);
    }
  }

  async function disablePush() {
    if (supportState !== "supported") return;

    setIsPending(true);
    setServerError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("settings.pushUnsubscribeError", "Failed to disable push notifications."));
      }

      setIsSubscribed(false);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : t("settings.pushUnsubscribeError", "Failed to disable push notifications.")
      );
    } finally {
      setIsPending(false);
    }
  }

  if (supportState === "checking") {
    return <p className="loom-muted">{t("common.loading", "Loading...")}</p>;
  }

  return (
    <div className="loom-stack-sm">
      <p className="loom-muted m-0">{supportMessage}</p>
      <div className="loom-inline-actions">
        <button
          type="button"
          className="loom-button-primary"
          onClick={() => void enablePush()}
          disabled={supportState !== "supported" || permission === "denied" || isSubscribed || isPending}
        >
          {isPending ? t("common.updating", "Updating...") : t("settings.enablePush", "Enable push")}
        </button>
        <button
          type="button"
          className="loom-button-ghost"
          onClick={() => void disablePush()}
          disabled={supportState !== "supported" || !isSubscribed || isPending}
        >
          {t("settings.disablePush", "Disable push")}
        </button>
      </div>
      {serverError ? <p className="loom-feedback-error m-0">{serverError}</p> : null}
    </div>
  );
}
