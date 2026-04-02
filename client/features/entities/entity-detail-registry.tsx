"use client";

import type { ComponentType } from "react";
import type { CollectionRouteState } from "@/lib/routing/collection-route-state";

export type EntityDetailRegistryPatch = Partial<CollectionRouteState>;

export type EntityDetailRegistryUpdateOptions = {
  replace?: boolean;
  scroll?: boolean;
};

export type EntityDetailRegistryEntryProps = {
  itemId: string;
  routeState: CollectionRouteState;
  close: () => void;
  updateRouteState: (patch: EntityDetailRegistryPatch, options?: EntityDetailRegistryUpdateOptions) => void;
};

export type EntityDetailRegistryEntry = {
  key: string;
  Component: ComponentType<EntityDetailRegistryEntryProps>;
  matches?: (itemId: string, routeState: CollectionRouteState) => boolean;
};

export function RouteStateEntityDetailRegistry({
  routeState,
  entries,
  close,
  updateRouteState
}: {
  routeState: CollectionRouteState;
  entries: EntityDetailRegistryEntry[];
  close: () => void;
  updateRouteState: (patch: EntityDetailRegistryPatch, options?: EntityDetailRegistryUpdateOptions) => void;
}) {
  const itemId = routeState.item;

  if (!itemId) {
    return null;
  }

  const entry =
    entries.find((candidate) => (candidate.matches ? candidate.matches(itemId, routeState) : true)) ?? null;

  if (!entry) {
    return null;
  }

  const Component = entry.Component;

  return <Component itemId={itemId} routeState={routeState} close={close} updateRouteState={updateRouteState} />;
}

