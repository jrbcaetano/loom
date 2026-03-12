"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

type TrackedWindow = Window & {
  __loomFetchPatched?: boolean;
  __loomFetchOriginal?: typeof fetch;
  __loomActionRequestCount?: number;
  __loomActionRequestListeners?: Set<(count: number) => void>;
};

function resolveMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function shouldTrack(input: RequestInfo | URL, init?: RequestInit) {
  const method = resolveMethod(input, init);
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

export function ActionFeedback() {
  const { t } = useI18n();
  const [pendingCount, setPendingCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const trackedWindow = window as TrackedWindow;
    trackedWindow.__loomActionRequestListeners ??= new Set();
    trackedWindow.__loomActionRequestCount ??= 0;

    const onCountChanged = (count: number) => {
      setPendingCount(count);
    };

    trackedWindow.__loomActionRequestListeners.add(onCountChanged);
    setPendingCount(trackedWindow.__loomActionRequestCount);

    if (!trackedWindow.__loomFetchPatched) {
      trackedWindow.__loomFetchOriginal = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const shouldTrackRequest = shouldTrack(input, init);

        if (shouldTrackRequest) {
          trackedWindow.__loomActionRequestCount = (trackedWindow.__loomActionRequestCount ?? 0) + 1;
          const count = trackedWindow.__loomActionRequestCount;
          trackedWindow.__loomActionRequestListeners?.forEach((listener) => listener(count));
        }

        try {
          return await (trackedWindow.__loomFetchOriginal as typeof fetch)(input, init);
        } finally {
          if (shouldTrackRequest) {
            trackedWindow.__loomActionRequestCount = Math.max(0, (trackedWindow.__loomActionRequestCount ?? 1) - 1);
            const count = trackedWindow.__loomActionRequestCount;
            trackedWindow.__loomActionRequestListeners?.forEach((listener) => listener(count));
          }
        }
      };

      trackedWindow.__loomFetchPatched = true;
    }

    return () => {
      trackedWindow.__loomActionRequestListeners?.delete(onCountChanged);
    };
  }, []);

  useEffect(() => {
    if (pendingCount <= 0) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pendingCount]);

  const label = useMemo(
    () => t("common.processing", "Processing..."),
    [t]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className="loom-action-feedback" role="status" aria-live="polite" aria-atomic>
      <span className="loom-action-feedback-spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
