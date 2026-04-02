"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCollectionRouteSearchParams, parseCollectionRouteState } from "@/lib/routing/collection-route-state";

type UpdateOptions = {
  replace?: boolean;
  scroll?: boolean;
};

export function useCollectionRouteState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSearch = searchParams.toString();

  const routeState = useMemo(() => parseCollectionRouteState(new URLSearchParams(rawSearch)), [rawSearch]);

  const updateRouteState = useCallback(
    (
      patch: Parameters<typeof buildCollectionRouteSearchParams>[1],
      options?: UpdateOptions
    ) => {
      const nextSearchParams = buildCollectionRouteSearchParams(new URLSearchParams(rawSearch), patch);
      const nextSearch = nextSearchParams.toString();
      const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;

      if (options?.replace ?? true) {
        router.replace(nextUrl, { scroll: options?.scroll ?? false });
        return;
      }

      router.push(nextUrl, { scroll: options?.scroll ?? false });
    },
    [pathname, rawSearch, router]
  );

  return {
    routeState,
    updateRouteState,
    openItem: (item: string, options?: UpdateOptions) => updateRouteState({ item }, options),
    clearItem: (options?: UpdateOptions) => updateRouteState({ item: null }, options),
    openCreate: (create: string, options?: UpdateOptions) => updateRouteState({ create }, options),
    clearCreate: (options?: UpdateOptions) => updateRouteState({ create: null }, options)
  };
}
