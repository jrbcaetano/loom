"use client";

import { useEffect } from "react";

export function PushServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => null);
  }, []);

  return null;
}
