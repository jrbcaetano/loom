export type CollectionRouteState = {
  view: string | null;
  group: string | null;
  sort: string | null;
  item: string | null;
  create: string | null;
  panel: string | null;
  filters: string[];
};

function readMultiValue(searchParams: URLSearchParams, key: string) {
  return searchParams.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
}

export function parseCollectionRouteState(searchParams: URLSearchParams): CollectionRouteState {
  return {
    view: searchParams.get("view"),
    group: searchParams.get("group"),
    sort: searchParams.get("sort"),
    item: searchParams.get("item"),
    create: searchParams.get("create"),
    panel: searchParams.get("panel"),
    filters: Array.from(new Set(readMultiValue(searchParams, "filter")))
  };
}

export function buildCollectionRouteSearchParams(
  currentSearchParams: URLSearchParams,
  patch: Partial<CollectionRouteState>
) {
  const next = new URLSearchParams(currentSearchParams.toString());

  const assign = (key: Exclude<keyof CollectionRouteState, "filters">, value: string | null | undefined) => {
    if (!value) {
      next.delete(key);
      return;
    }

    next.set(key, value);
  };

  assign("view", patch.view);
  assign("group", patch.group);
  assign("sort", patch.sort);
  assign("item", patch.item);
  assign("create", patch.create);
  assign("panel", patch.panel);

  if (patch.filters) {
    next.delete("filter");
    for (const filterValue of patch.filters) {
      next.append("filter", filterValue);
    }
  }

  return next;
}
