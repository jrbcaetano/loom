"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { ResponsivePanel } from "@/components/common/responsive-panel";
import { useI18n } from "@/lib/i18n/context";

const addItemSchema = z.object({
  text: z.string().trim().min(1).max(240),
  quantity: z.string().trim().max(120).optional(),
  price: z
    .string()
    .trim()
    .max(20)
    .refine((value) => value.length === 0 || /^\d+(?:[.,]\d{1,2})?$/.test(value), "Enter a valid price")
    .optional(),
  category: z.string().trim().max(120).optional()
});

type AddItemValues = z.infer<typeof addItemSchema>;

const editItemSchema = addItemSchema.extend({
  itemId: z.string().uuid()
});

type EditItemValues = z.infer<typeof editItemSchema>;

type ListItem = {
  id: string;
  text: string;
  quantity: string | null;
  price: string | number | null;
  category: string | null;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  createdByName: string | null;
  createdByAvatarUrl: string | null;
  updatedByUserId: string | null;
  updatedByName: string | null;
  updatedByAvatarUrl: string | null;
};

type ListCategory = {
  value: string;
  label: string;
};

type CategoryGroupRow = {
  key: string;
  label: string;
  standaloneValue: string | null;
  standaloneLabel: string | null;
  childOptions: Array<{ value: string; label: string }>;
};

type SimilarSuggestion = {
  item: ListItem;
  score: number;
};

async function fetchListItems(listId: string) {
  const response = await fetch(`/api/lists/${listId}/items`, { cache: "no-store" });
  const payload = (await response.json()) as { items: ListItem[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load list items");
  }

  return payload.items;
}

function normalizeItemName(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalizeItemName(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function getSimilarityScore(target: string, candidate: string) {
  const normalizedTarget = normalizeItemName(target);
  const normalizedCandidate = normalizeItemName(candidate);
  if (!normalizedTarget || !normalizedCandidate) {
    return 0;
  }

  if (normalizedTarget === normalizedCandidate) {
    return 100;
  }

  if (normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate)) {
    return 70;
  }

  const targetTokens = new Set(tokenize(normalizedTarget));
  const candidateTokens = new Set(tokenize(normalizedCandidate));
  if (targetTokens.size === 0 || candidateTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of targetTokens) {
    if (candidateTokens.has(token)) {
      overlap += 1;
    }
  }

  if (overlap === 0) {
    return 0;
  }

  return Math.round((overlap / Math.max(targetTokens.size, candidateTokens.size)) * 100);
}

function splitCategoryLevels(value: string | null | undefined) {
  const category = value?.trim();
  if (!category) {
    return { level1: null, level2: null };
  }

  const separatorIndex = category.indexOf(" - ");
  if (separatorIndex === -1) {
    return { level1: category, level2: null };
  }

  const level1 = category.slice(0, separatorIndex).trim();
  const level2 = category.slice(separatorIndex + 3).trim();

  return {
    level1: level1 || category,
    level2: level2 || null
  };
}

function shouldIgnoreSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("button, a, input, select, textarea, label, form"));
}

function parseQuantityForQuickAdjust(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { canAdjust: true, value: 0, raw: "" };
  }

  if (/^\d+$/.test(trimmed)) {
    return { canAdjust: true, value: Number.parseInt(trimmed, 10), raw: trimmed };
  }

  return { canAdjust: false, value: 0, raw: trimmed };
}

function parseQuantityMultiplier(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return 1;
  }

  if (/^\d+$/.test(trimmed)) {
    return Math.max(1, Number.parseInt(trimmed, 10));
  }

  return 1;
}

function parsePriceValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePriceInputValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return value ?? "";
}

function mixRgb(from: readonly [number, number, number], to: readonly [number, number, number], progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = Math.round(from[0] + (to[0] - from[0]) * clamped);
  const g = Math.round(from[1] + (to[1] - from[1]) * clamped);
  const b = Math.round(from[2] + (to[2] - from[2]) * clamped);
  return `rgb(${r} ${g} ${b})`;
}

function getThemeRowColors() {
  if (typeof document === "undefined") {
    return {
      active: [255, 255, 255] as const,
      completed: [243, 245, 247] as const
    };
  }

  const theme = document.documentElement.dataset.theme;
  if (theme === "loom-dark") {
    return {
      active: [21, 31, 48] as const,
      completed: [27, 40, 64] as const
    };
  }

  if (theme === "hearth") {
    return {
      active: [255, 253, 250] as const,
      completed: [243, 235, 225] as const
    };
  }

  return {
    active: [255, 255, 255] as const,
    completed: [243, 245, 247] as const
  };
}

function getRowBackgroundColor(isCompletedSection: boolean, swipeOffset: number) {
  const colors = getThemeRowColors();
  if (!swipeOffset) {
    return isCompletedSection ? mixRgb(colors.completed, colors.completed, 1) : mixRgb(colors.active, colors.active, 1);
  }

  const progress = Math.min(1, Math.abs(swipeOffset) / 88);
  return isCompletedSection
    ? mixRgb(colors.completed, colors.active, progress)
    : mixRgb(colors.active, colors.completed, progress);
}

export function ListItemsClient({
  listId,
  isSystemShoppingList,
  canDelete,
  categories
}: {
  listId: string;
  isSystemShoppingList: boolean;
  canDelete: boolean;
  categories: ListCategory[];
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [showComposer, setShowComposer] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [isItemMenuOpen, setIsItemMenuOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileCategoryPicker, setIsMobileCategoryPicker] = useState(false);
  const [similarItemSuggestions, setSimilarItemSuggestions] = useState<SimilarSuggestion[]>([]);
  const [pendingAddValues, setPendingAddValues] = useState<AddItemValues | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importStoreHint, setImportStoreHint] = useState("");
  const [swipePreview, setSwipePreview] = useState<{ itemId: string; offset: number } | null>(null);
  const [touchTracking, setTouchTracking] = useState<{
    itemId: string;
    startX: number;
    startY: number;
    lastX: number;
    isCompletedSection: boolean;
  } | null>(null);

  const form = useForm<AddItemValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { text: "", quantity: "", price: "", category: "" }
  });

  const editForm = useForm<EditItemValues>({
    resolver: zodResolver(editItemSchema),
    defaultValues: { itemId: "", text: "", quantity: "", price: "", category: "" }
  });

  const queryKey = ["list-items", listId] as const;
  const completedExpandedStorageKey = `loom:list:${listId}:completed-expanded`;
  const itemPickerRef = useRef<HTMLDivElement | null>(null);
  const categoryPickerRef = useRef<HTMLDivElement | null>(null);

  const { data: items, isPending, error } = useQuery({
    queryKey,
    queryFn: () => fetchListItems(listId)
  });

  const addMutation = useMutation({
    mutationFn: async (values: AddItemValues) => {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add item");
      }
    },
    onSuccess: () => {
      closeComposer();
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update item");
      }
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems = queryClient.getQueryData<ListItem[]>(queryKey);
      const itemId = typeof body.itemId === "string" ? body.itemId : null;

      if (!previousItems || !itemId) {
        return { previousItems };
      }

      const nextItems = previousItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const nextItem: ListItem = {
          ...item,
          updatedAt: new Date().toISOString()
        };

        if (typeof body.text === "string") {
          nextItem.text = body.text;
        }

        if (Object.prototype.hasOwnProperty.call(body, "quantity")) {
          nextItem.quantity = typeof body.quantity === "string" ? body.quantity : body.quantity === null ? null : item.quantity;
        }

        if (Object.prototype.hasOwnProperty.call(body, "price")) {
          nextItem.price = typeof body.price === "string" ? body.price : body.price === null ? null : item.price;
        }

        if (Object.prototype.hasOwnProperty.call(body, "category")) {
          nextItem.category = typeof body.category === "string" ? body.category : body.category === null ? null : item.category;
        }

        if (typeof body.isCompleted === "boolean") {
          nextItem.isCompleted = body.isCompleted;
        }

        if (typeof body.sortOrder === "number") {
          nextItem.sortOrder = body.sortOrder;
        }

        return nextItem;
      });

      queryClient.setQueryData(queryKey, nextItems);
      return { previousItems };
    },
    onError: (_error, _body, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey })
  });

  const deleteListMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete list");
      }
    },
    onSuccess: () => {
      router.push("/lists");
      router.refresh();
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/lists/${listId}/items?itemId=${encodeURIComponent(itemId)}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete item");
      }
    },
    onSuccess: () => {
      closeEdit();
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const importRecentPurchasesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      formData.append("storeHint", importStoreHint);

      const response = await fetch(`/api/lists/${listId}/recent-purchases`, {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as {
        insertedCount?: number;
        updatedCount?: number;
        totalCount?: number;
        notImportedCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to import recent purchases");
      }

      return payload;
    },
    onSuccess: () => {
      setShowImportPanel(false);
      setImportFiles([]);
      setImportStoreHint("");
      queryClient.invalidateQueries({ queryKey });
      router.refresh();
    }
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`list-items-${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "list_items",
          filter: `list_id=eq.${listId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [listId, queryClient]);

  useEffect(() => {
    if (!showComposer) {
      setCategoryQuery("");
      setIsCategoryMenuOpen(false);
      setIsItemMenuOpen(false);
    }
  }, [showComposer]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.localStorage.getItem(completedExpandedStorageKey);
    if (storedValue === "0") {
      setIsCompletedExpanded(false);
      return;
    }

    setIsCompletedExpanded(true);
  }, [completedExpandedStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(completedExpandedStorageKey, isCompletedExpanded ? "1" : "0");
  }, [completedExpandedStorageKey, isCompletedExpanded]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 959px)");
    const updateIsMobilePicker = () => setIsMobileCategoryPicker(mediaQuery.matches);

    updateIsMobilePicker();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateIsMobilePicker);
      return () => mediaQuery.removeEventListener("change", updateIsMobilePicker);
    }

    mediaQuery.addListener(updateIsMobilePicker);
    return () => mediaQuery.removeListener(updateIsMobilePicker);
  }, []);

  useEffect(() => {
    if (!isCategoryMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | globalThis.TouchEvent) => {
      if (!categoryPickerRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && categoryPickerRef.current.contains(target)) {
        return;
      }

      setIsCategoryMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    if (!isItemMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | globalThis.TouchEvent) => {
      if (!itemPickerRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && itemPickerRef.current.contains(target)) {
        return;
      }

      setIsItemMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isItemMenuOpen]);

  const activeItems = (items ?? []).filter((item) => !item.isCompleted);
  const completedItems = (items ?? []).filter((item) => item.isCompleted);
  const categoryLabelMap = useMemo(() => new Map(categories.map((category) => [category.value.toLowerCase(), category.label])), [categories]);
  const categoryOptions = useMemo(() => {
    const values = [...categories.map((category) => category.value), ...(items ?? []).map((item) => item.category ?? "")];
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  }, [categories, items]);
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, CategoryGroupRow>();

    for (const value of categoryOptions) {
      const rawLevels = splitCategoryLevels(value);
      const displayValue = categoryLabelMap.get(value.toLowerCase()) ?? value;
      const displayLevels = splitCategoryLevels(displayValue);
      const level1Value = rawLevels.level1 ?? value;
      const level1Label = displayLevels.level1 ?? level1Value;
      const key = level1Value.toLocaleLowerCase();
      const existing = groups.get(key) ?? {
        key,
        label: level1Label,
        standaloneValue: null,
        standaloneLabel: null,
        childOptions: []
      };

      if (rawLevels.level2) {
        existing.childOptions.push({
          value,
          label: displayLevels.level2 ?? rawLevels.level2
        });
      } else {
        existing.standaloneValue = value;
        existing.standaloneLabel = level1Label;
      }

      groups.set(key, existing);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        childOptions: group.childOptions.sort((left, right) => left.label.localeCompare(right.label))
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [categoryLabelMap, categoryOptions]);

  const filteredCategoryGroups = useMemo(() => {
    const normalizedFilter = categoryQuery.trim().toLocaleLowerCase();

    if (!normalizedFilter) {
      return categoryGroups;
    }

    return categoryGroups
      .map((group) => {
        const headingMatches = group.label.toLocaleLowerCase().includes(normalizedFilter);
        const filteredChildren = group.childOptions.filter((child) => {
          const fullLabel = `${group.label} ${child.label}`.toLocaleLowerCase();
          return child.label.toLocaleLowerCase().includes(normalizedFilter) || fullLabel.includes(normalizedFilter);
        });

        if (group.childOptions.length > 0) {
          if (headingMatches) {
            return group;
          }

          if (filteredChildren.length > 0) {
            return {
              ...group,
              childOptions: filteredChildren
            };
          }

          return null;
        }

        const standaloneMatches = (group.standaloneLabel ?? "").toLocaleLowerCase().includes(normalizedFilter);
        return headingMatches || standaloneMatches ? group : null;
      })
      .filter((group): group is CategoryGroupRow => Boolean(group));
  }, [categoryGroups, categoryQuery]);

  const groupedActive = useMemo(() => {
    if (!isSystemShoppingList) {
      return [{ key: "items", label: t("lists.items"), items: activeItems }] as Array<{ key: string; label: string; items: ListItem[] }>;
    }

    const uncategorizedLabel = t("lists.uncategorized");
    const groups = new Map<string, { label: string; isUncategorized: boolean; items: ListItem[] }>();

    for (const item of activeItems) {
      const rawCategory = item.category?.trim() || null;
      const displayCategory = rawCategory ? (categoryLabelMap.get(rawCategory.toLowerCase()) ?? rawCategory) : null;
      const { level1 } = splitCategoryLevels(displayCategory);

      const label = level1 ?? uncategorizedLabel;
      const isUncategorized = !level1;
      const key = isUncategorized ? "__uncategorized__" : label.toLocaleLowerCase();
      const existing = groups.get(key);

      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, { label, isUncategorized, items: [item] });
      }
    }

    return Array.from(groups.entries())
      .sort(([, left], [, right]) => {
        if (left.isUncategorized) return 1;
        if (right.isUncategorized) return -1;
        return left.label.localeCompare(right.label);
      })
      .map(([key, group]) => ({
        key,
        label: group.label,
        items: group.items
      }));
  }, [activeItems, categoryLabelMap, isSystemShoppingList, t]);

  const categoryMemory = useMemo(() => {
    const memory = new Map<string, string>();
    for (const item of items ?? []) {
      if (item.category?.trim()) {
        memory.set(normalizeItemName(item.text), item.category.trim());
      }
    }
    return memory;
  }, [items]);

  const textInputValue = form.watch("text");
  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    [locale]
  );
  const textSuggestions = useMemo(() => {
    const normalized = normalizeItemName(textInputValue ?? "");
    if (!normalized || normalized.length < 2) {
      return [] as ListItem[];
    }

    return (items ?? [])
      .filter((item) => normalizeItemName(item.text).includes(normalized))
      .sort((left, right) => left.text.localeCompare(right.text))
      .slice(0, 6);
  }, [items, textInputValue]);
  const hasExactTypedMatch = useMemo(() => {
    const normalized = normalizeItemName(textInputValue ?? "");
    if (!normalized) {
      return false;
    }

    return (items ?? []).some((item) => normalizeItemName(item.text) === normalized);
  }, [items, textInputValue]);
  const remainingExpectedCost = useMemo(
    () =>
      activeItems.reduce((sum, item) => {
        const price = parsePriceValue(item.price);
        if (price === null) {
          return sum;
        }

        return sum + price * parseQuantityMultiplier(item.quantity);
      }, 0),
    [activeItems]
  );

  const completedGrouped = useMemo(() => {
    if (!isSystemShoppingList) {
      return [
        {
          key: "completed",
          label: t("lists.completed", "Completed"),
          items: completedItems
            .slice()
            .sort((left, right) => left.text.localeCompare(right.text))
        }
      ] as Array<{ key: string; label: string; items: ListItem[] }>;
    }

    const uncategorizedLabel = t("lists.uncategorized");
    const groups = new Map<string, { label: string; items: ListItem[]; isUncategorized: boolean }>();

    for (const item of completedItems) {
      const rawCategory = item.category?.trim() || null;
      const displayCategory = rawCategory ? (categoryLabelMap.get(rawCategory.toLowerCase()) ?? rawCategory) : null;
      const label = displayCategory ?? uncategorizedLabel;
      const key = displayCategory ? label.toLocaleLowerCase() : "__uncategorized__";
      const current = groups.get(key);
      if (current) {
        current.items.push(item);
      } else {
        groups.set(key, { label, items: [item], isUncategorized: !displayCategory });
      }
    }

    return Array.from(groups.entries())
      .sort(([, left], [, right]) => {
        if (left.isUncategorized) return 1;
        if (right.isUncategorized) return -1;
        return left.label.localeCompare(right.label);
      })
      .map(([key, group]) => ({
        key,
        label: group.label,
        items: group.items.slice().sort((left, right) => left.text.localeCompare(right.text))
      }));
  }, [categoryLabelMap, completedItems, isSystemShoppingList, t]);

  function applyCategorySuggestion(itemName: string) {
    const suggestedCategory = categoryMemory.get(normalizeItemName(itemName));
    const currentCategory = form.getValues("category")?.trim();

    if (suggestedCategory && categoryOptions.some((value) => value.toLowerCase() === suggestedCategory.toLowerCase()) && !currentCategory) {
      form.setValue("category", suggestedCategory, { shouldDirty: true });
      setCategoryQuery(categoryLabelMap.get(suggestedCategory.toLowerCase()) ?? suggestedCategory);
      return suggestedCategory;
    }

    return suggestedCategory;
  }

  function applyItemSuggestion(item: ListItem) {
    form.setValue("text", item.text, { shouldDirty: true, shouldValidate: true });
    form.setValue("quantity", item.quantity ?? "", { shouldDirty: true });
    form.setValue("price", normalizePriceInputValue(item.price), { shouldDirty: true });
    form.setValue("category", item.category ?? "", { shouldDirty: true });
    setIsItemMenuOpen(false);
    if (item.category?.trim()) {
      setCategoryQuery(categoryLabelMap.get(item.category.toLowerCase()) ?? item.category);
    }
  }

  function findSimilarItems(itemName: string) {
    const normalizedTarget = normalizeItemName(itemName);
    if (!normalizedTarget || normalizedTarget.length < 3) {
      return [] as SimilarSuggestion[];
    }

    return (items ?? [])
      .map((item) => ({
        item,
        score: getSimilarityScore(normalizedTarget, item.text)
      }))
      .filter((entry) => entry.score >= 40 && normalizeItemName(entry.item.text) !== normalizedTarget)
      .sort((left, right) => right.score - left.score || left.item.text.localeCompare(right.item.text))
      .slice(0, 5);
  }

  function submitNewItem(values: AddItemValues) {
    const suggestedCategory = applyCategorySuggestion(values.text);
    addMutation.mutate({
      ...values,
      price: values.price?.trim() || undefined,
      category: values.category?.trim() || suggestedCategory || undefined
    });
  }

  function mergeIntoExistingItem(itemId: string, values: AddItemValues) {
    const suggestedCategory = applyCategorySuggestion(values.text);
    updateMutation.mutate(
      {
        itemId,
        quantity: values.quantity?.trim() || null,
        price: values.price?.trim() || null,
        category: values.category?.trim() || suggestedCategory || null,
        isCompleted: false
      },
      {
        onSuccess: () => {
          closeComposer();
        }
      }
    );
  }

  const textField = form.register("text");

  function onSubmit(values: AddItemValues) {
    const exactMatch = (items ?? []).find((item) => normalizeItemName(item.text) === normalizeItemName(values.text));
    if (exactMatch) {
      mergeIntoExistingItem(exactMatch.id, values);
      return;
    }

    const similar = findSimilarItems(values.text);
    if (similar.length > 0) {
      setPendingAddValues(values);
      setSimilarItemSuggestions(similar);
      return;
    }

    submitNewItem(values);
  }

  function closeEdit() {
    setEditingItemId(null);
    editForm.reset({ itemId: "", text: "", quantity: "", price: "", category: "" });
  }

  function closeComposer() {
    setShowComposer(false);
    form.reset({ text: "", quantity: "", price: "", category: "" });
    setCategoryQuery("");
    setIsCategoryMenuOpen(false);
    setIsItemMenuOpen(false);
    setPendingAddValues(null);
    setSimilarItemSuggestions([]);
  }

  function openAddPanel() {
    closeEdit();
    setShowComposer(true);
  }

  function closePanel() {
    closeComposer();
    closeEdit();
  }

  function closeImportPanel() {
    setShowImportPanel(false);
    setImportFiles([]);
    setImportStoreHint("");
  }

  function submitImportRecentPurchases() {
    if (importFiles.length === 0) {
      return;
    }

    importRecentPurchasesMutation.mutate(importFiles);
  }

  function startEdit(item: ListItem) {
    setShowComposer(false);
    setEditingItemId(item.id);
    editForm.reset({
      itemId: item.id,
      text: item.text,
      quantity: item.quantity ?? "",
      price: normalizePriceInputValue(item.price),
      category: item.category ?? ""
    });
  }

  function submitEdit(values: EditItemValues) {
    updateMutation.mutate(
      {
        itemId: values.itemId,
        text: values.text,
        quantity: values.quantity?.trim() || null,
        price: values.price?.trim() || null,
        category: values.category?.trim() || null
      },
      {
        onSuccess: () => {
          closeEdit();
        }
      }
    );
  }

  function confirmDeleteItem(itemId: string) {
    if (!window.confirm(t("common.deleteConfirm"))) {
      return;
    }

    deleteItemMutation.mutate(itemId);
  }

  function setItemCompletion(itemId: string, isCompleted: boolean) {
    if (editingItemId === itemId) {
      closeEdit();
    }
    updateMutation.mutate({ itemId, isCompleted });
  }

  function adjustItemQuantity(item: ListItem, delta: number) {
    const quantityState = parseQuantityForQuickAdjust(item.quantity);
    if (!quantityState.canAdjust) {
      return;
    }

    const nextValue = Math.max(0, quantityState.value + delta);
    if (nextValue === quantityState.value) {
      return;
    }

    updateMutation.mutate({
      itemId: item.id,
      quantity: String(nextValue)
    });
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) {
      return t("common.notSet");
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t("common.notSet");
    }

    return date.toLocaleString(locale);
  }

  function formatPrice(value: string | number | null | undefined) {
    const numericValue = typeof value === "number" ? value : parsePriceValue(value);
    if (numericValue === null) {
      return null;
    }

    return priceFormatter.format(numericValue);
  }

  function handleRowTouchStart(event: ReactTouchEvent<HTMLDivElement>, itemId: string, isCompletedSection: boolean) {
    if (shouldIgnoreSwipeTarget(event.target) || editingItemId === itemId) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    setSwipePreview(null);
    setTouchTracking({
      itemId,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      isCompletedSection
    });
  }

  function handleRowTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    setTouchTracking((current) => {
      if (!current) {
        return current;
      }

      const touch = event.touches[0];
      if (!touch) {
        return current;
      }

      const deltaX = touch.clientX - current.startX;
      const deltaY = touch.clientY - current.startY;
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8;
      const directionAllowed = current.isCompletedSection ? deltaX > 0 : deltaX < 0;

      if (isHorizontal && directionAllowed) {
        event.preventDefault();
        const offset = Math.max(-88, Math.min(88, deltaX));
        setSwipePreview({ itemId: current.itemId, offset });

        return {
          ...current,
          lastX: touch.clientX
        };
      }

      return {
        ...current,
        lastX: touch.clientX
      };
    });
  }

  function handleRowTouchEnd() {
    setTouchTracking((current) => {
      if (!current) {
        return null;
      }

      const deltaX = current.lastX - current.startX;
      const triggerThreshold = 70;
      const shouldComplete = !current.isCompletedSection && deltaX <= -triggerThreshold;
      const shouldRestore = current.isCompletedSection && deltaX >= triggerThreshold;

      if (shouldComplete) {
        setItemCompletion(current.itemId, true);
      } else if (shouldRestore) {
        setItemCompletion(current.itemId, false);
      }

      return null;
    });
    setSwipePreview(null);
  }

  function renderItemRow(item: ListItem, isCompletedSection: boolean, categoryBadgeLabel?: string | null) {
    const rawCategory = item.category?.trim() || null;
    const displayCategory = rawCategory ? (categoryLabelMap.get(rawCategory.toLowerCase()) ?? rawCategory) : null;
    const { level2 } = splitCategoryLevels(displayCategory);
    const swipeOffset = swipePreview?.itemId === item.id ? swipePreview.offset : 0;
    const quantityState = parseQuantityForQuickAdjust(item.quantity);
    const formattedPrice = formatPrice(item.price);
    const swipeProgress = Math.min(1, Math.abs(swipeOffset) / 88);
    const rowBackgroundColor = getRowBackgroundColor(isCompletedSection, swipeOffset);
    const rowStyle: { transform?: string; backgroundColor: string } = {
      backgroundColor: rowBackgroundColor
    };
    if (swipeOffset) {
      rowStyle.transform = `translateX(${swipeOffset}px)`;
    }

    return (
      <div key={item.id} className="loom-lists-detail-row-shell">
        <div
          className={`loom-lists-swipe-track ${isCompletedSection ? "is-completed-section" : "is-active-section"}`}
          style={{ backgroundColor: rowBackgroundColor }}
        >
          <span className="loom-lists-swipe-label" style={{ opacity: swipeProgress }}>
            {isCompletedSection ? t("common.open", "Open") : t("common.complete")}
          </span>
          <div
            className="loom-lists-detail-row"
            style={rowStyle}
            onTouchStart={(event) => handleRowTouchStart(event, item.id, isCompletedSection)}
            onTouchMove={handleRowTouchMove}
            onTouchEnd={handleRowTouchEnd}
            onTouchCancel={handleRowTouchEnd}
          >
            <input
              type="checkbox"
              className="loom-lists-detail-check"
              checked={item.isCompleted}
              onChange={() => setItemCompletion(item.id, !item.isCompleted)}
            />

            <span className="loom-lists-detail-main">
              <span className={`loom-lists-detail-name ${isCompletedSection ? "loom-home-line-through" : ""}`}>{item.text}</span>
              {isSystemShoppingList && level2 ? <span className="loom-lists-detail-qty">{level2}</span> : null}
              {categoryBadgeLabel ? <span className="loom-lists-item-category-badge">{categoryBadgeLabel}</span> : null}
            </span>

            <span className="loom-inline-actions">
              {formattedPrice ? <span className="loom-lists-price-badge">{formattedPrice}</span> : null}
              {quantityState.canAdjust ? (
                <span className="loom-lists-qty-stepper">
                  <button
                    type="button"
                    className="loom-lists-qty-btn"
                    onClick={() => adjustItemQuantity(item, -1)}
                    disabled={updateMutation.isPending || quantityState.value <= 0}
                    aria-label={t("lists.form.quantity")}
                  >
                    -
                  </button>
                  <span className="loom-lists-qty-value">{quantityState.value}</span>
                  <button
                    type="button"
                    className="loom-lists-qty-btn"
                    onClick={() => adjustItemQuantity(item, 1)}
                    disabled={updateMutation.isPending}
                    aria-label={t("lists.form.quantity")}
                  >
                    +
                  </button>
                </span>
              ) : quantityState.raw ? (
                <span className="loom-lists-qty-badge">{quantityState.raw}</span>
              ) : null}

              <button
                type="button"
                className="loom-lists-edit-icon"
                onClick={() => startEdit(item)}
                title={t("common.edit")}
                aria-label={t("common.edit")}
              >
                <span aria-hidden>{"\u270E"}</span>
              </button>
            </span>
          </div>
        </div>
      </div>
    );
  }

  function confirmDeleteList() {
    if (!canDelete) return;
    if (!window.confirm(t("lists.deleteConfirm"))) return;
    deleteListMutation.mutate();
  }

  const editingItem = editingItemId ? (items ?? []).find((item) => item.id === editingItemId) ?? null : null;

  return (
    <div className="loom-stack">
      <div className="loom-lists-summary-row">
        <p className="loom-lists-detail-summary">
          {activeItems.length} {t("lists.remaining")} - {completedItems.length} {t("lists.completed")}
        </p>
        <div className="loom-lists-summary-actions">
          <div className="loom-lists-cost-pill">
            <span className="loom-lists-cost-pill-label">{t("lists.expectedCost", "Expected cost")}</span>
            <strong className="loom-lists-cost-pill-value">{formatPrice(remainingExpectedCost) ?? "0.00"}</strong>
          </div>
          {isSystemShoppingList ? (
            <button type="button" className="loom-lists-plus-button" aria-label={t("lists.addItem")} onClick={openAddPanel}>
              +
            </button>
          ) : null}
        </div>
      </div>

      {form.formState.errors.text ? <p className="loom-feedback-error">{form.formState.errors.text.message}</p> : null}
      {form.formState.errors.price ? <p className="loom-feedback-error">{form.formState.errors.price.message}</p> : null}
      {addMutation.error ? <p className="loom-feedback-error">{addMutation.error.message}</p> : null}
      {updateMutation.error ? <p className="loom-feedback-error">{updateMutation.error.message}</p> : null}
      {deleteListMutation.error ? <p className="loom-feedback-error">{deleteListMutation.error.message}</p> : null}
      {deleteItemMutation.error ? <p className="loom-feedback-error">{deleteItemMutation.error.message}</p> : null}
      {importRecentPurchasesMutation.data ? (
        <p className="loom-muted small">
          {t(
            "lists.importRecentPurchasesDone",
            "Import finished: {inserted} created, {updated} updated, {notImported} not imported."
          )
            .replace("{count}", String(importRecentPurchasesMutation.data.totalCount ?? 0))
            .replace("{inserted}", String(importRecentPurchasesMutation.data.insertedCount ?? 0))
            .replace("{updated}", String(importRecentPurchasesMutation.data.updatedCount ?? 0))
            .replace("{notImported}", String(importRecentPurchasesMutation.data.notImportedCount ?? 0))}
        </p>
      ) : null}
      {isPending ? <p className="loom-muted">{t("common.loading")}</p> : null}
      {error ? <p className="loom-feedback-error">{error.message}</p> : null}

      {groupedActive.map((group) => (
        <section key={group.key} className="loom-stack-sm">
          <p className="loom-lists-section-title">{group.label}</p>
          <div className="loom-lists-detail-card">
            {group.items.length === 0 ? <p className="loom-muted p-4">{t("lists.noItems")}</p> : null}
            {group.items.map((item) => renderItemRow(item, false))}
          </div>
        </section>
      ))}

      {completedItems.length > 0 ? (
        <section className="loom-stack-sm">
          <div className="loom-row-between">
            <p className="loom-lists-section-title">
              {t("lists.completed")} ({completedItems.length})
            </p>
            <button type="button" className="loom-button-ghost" onClick={() => setIsCompletedExpanded((value) => !value)}>
              {isCompletedExpanded
                ? t("lists.collapseCompleted", "Hide completed items")
                : t("lists.expandCompleted", "Show completed items")}
            </button>
          </div>
          {!isCompletedExpanded ? (
            <p className="loom-muted small">{t("lists.completedCollapsedCount", "{count} completed items hidden").replace("{count}", String(completedItems.length))}</p>
          ) : (
            <div className="loom-lists-detail-card">
              {completedGrouped.map((group) => (
                <div key={group.key} className="loom-stack-sm p-2">
                  <p className="loom-lists-group-title">{group.label}</p>
                  <div className="loom-stack-sm">
                    {group.items.map((item) => renderItemRow(item, true, isSystemShoppingList ? group.label : null))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <ResponsivePanel
        isOpen={showComposer || Boolean(editingItem)}
        title={showComposer ? t("lists.addItem") : t("common.edit")}
        onClose={closePanel}
      >
        {showComposer ? (
          <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="loom-lists-quick-add">
              <div className="loom-item-picker" ref={itemPickerRef}>
                <input
                  className="loom-input"
                  type="text"
                  placeholder={t("lists.form.itemName")}
                  {...textField}
                  onFocus={() => {
                    if ((textInputValue ?? "").trim().length > 0) {
                      setIsItemMenuOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    textField.onChange(event);
                    const nextValue = event.target.value.trim();
                    setIsItemMenuOpen(nextValue.length > 0);
                  }}
                  onBlur={(event) => {
                    textField.onBlur(event);
                    applyCategorySuggestion(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setIsItemMenuOpen(false);
                    }
                  }}
                />
                {isItemMenuOpen && (textInputValue ?? "").trim().length > 0 ? (
                  <div className="loom-item-picker-menu">
                    {!hasExactTypedMatch ? (
                      <button
                        type="button"
                        className="loom-item-picker-option is-create"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setIsItemMenuOpen(false)}
                      >
                        <span className="loom-item-picker-option-main">{t("lists.useTypedValue", "Use") + ` "${textInputValue?.trim() ?? ""}"`}</span>
                        <span className="loom-item-picker-option-meta">{t("lists.addAsNew", "Add as new item")}</span>
                      </button>
                    ) : null}
                    {textSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="loom-item-picker-option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyItemSuggestion(suggestion)}
                      >
                        <span className="loom-item-picker-option-main">{suggestion.text}</span>
                        <span className="loom-item-picker-option-meta">
                          {[suggestion.quantity, suggestion.category].filter(Boolean).join(" - ") || t("lists.form.noCategory")}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <input className="loom-input" type="text" placeholder={t("lists.form.quantity")} {...form.register("quantity")} />
              <input className="loom-input" type="text" inputMode="decimal" placeholder={t("lists.form.price", "Price")} {...form.register("price")} />
              {isMobileCategoryPicker ? (
                <select
                  className="loom-input"
                  {...form.register("category")}
                  onChange={(event) => {
                    form.setValue("category", event.target.value, { shouldDirty: true });
                  }}
                >
                  <option value="">{t("lists.form.noCategory")}</option>
                  {categoryGroups.map((group) => {
                    if (group.childOptions.length === 0 && group.standaloneValue) {
                      return (
                        <option key={group.standaloneValue} value={group.standaloneValue}>
                          {group.standaloneLabel ?? group.label}
                        </option>
                      );
                    }

                    return (
                      <optgroup key={group.key} label={group.label}>
                        {group.childOptions.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              ) : (
                <div className="loom-category-picker" ref={categoryPickerRef}>
                  <input
                    className="loom-input"
                    type="text"
                    value={categoryQuery}
                    placeholder={`${t("common.category", "Category")}...`}
                    onFocus={() => setIsCategoryMenuOpen(true)}
                    onChange={(event) => {
                      setCategoryQuery(event.target.value);
                      form.setValue("category", "", { shouldDirty: true });
                      setIsCategoryMenuOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsCategoryMenuOpen(false);
                      }
                    }}
                  />
                  {isCategoryMenuOpen ? (
                    <div className="loom-category-picker-menu">
                      <button
                        type="button"
                        className="loom-category-picker-option is-clear"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          form.setValue("category", "", { shouldDirty: true });
                          setCategoryQuery("");
                          setIsCategoryMenuOpen(false);
                        }}
                      >
                        {t("lists.form.noCategory")}
                      </button>
                      {filteredCategoryGroups.map((group) => (
                        <div key={group.key} className="loom-category-picker-group">
                          {group.childOptions.length > 0 ? <p className="loom-category-picker-heading">{group.label}</p> : null}
                          {group.childOptions.length === 0 && group.standaloneValue ? (
                            <button
                              type="button"
                              className="loom-category-picker-option"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                form.setValue("category", group.standaloneValue!, { shouldDirty: true });
                                setCategoryQuery(group.standaloneLabel ?? group.label);
                                setIsCategoryMenuOpen(false);
                              }}
                            >
                              {group.standaloneLabel ?? group.label}
                            </button>
                          ) : null}
                          {group.childOptions.map((category) => (
                            <button
                              key={category.value}
                              type="button"
                              className="loom-category-picker-option is-child"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                form.setValue("category", category.value, { shouldDirty: true });
                                setCategoryQuery(`${group.label} - ${category.label}`);
                                setIsCategoryMenuOpen(false);
                              }}
                            >
                              {category.label}
                            </button>
                          ))}
                        </div>
                      ))}
                      {filteredCategoryGroups.length === 0 ? <p className="loom-muted small m-0 p-2">{t("common.none", "None")}</p> : null}
                    </div>
                  ) : null}
                </div>
              )}
              {categoryOptions.length === 0 ? <p className="loom-muted small m-0">{t("lists.noCategoriesConfigured")}</p> : null}
              <button className="loom-button-primary" type="submit" disabled={addMutation.isPending}>
                {t("lists.saveItem")}
              </button>
            </div>
          </form>
        ) : null}

        {editingItem ? (
          <form className="loom-form-stack" onSubmit={editForm.handleSubmit(submitEdit)}>
            <label className="loom-lists-inline-field">
              <span className="loom-lists-inline-label">{t("lists.form.itemName")}</span>
              <input className="loom-input" type="text" {...editForm.register("text")} />
            </label>
            <label className="loom-lists-inline-field">
              <span className="loom-lists-inline-label">{t("lists.form.quantity")}</span>
              <input className="loom-input" type="text" {...editForm.register("quantity")} />
            </label>
            <label className="loom-lists-inline-field">
              <span className="loom-lists-inline-label">{t("lists.form.price", "Price")}</span>
              <input className="loom-input" type="text" inputMode="decimal" {...editForm.register("price")} />
            </label>
            <label className="loom-lists-inline-field">
              <span className="loom-lists-inline-label">{t("common.category")}</span>
              <select className="loom-input" {...editForm.register("category")}>
                <option value="">{t("lists.form.noCategory")}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabelMap.get(category.toLowerCase()) ?? category}
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" {...editForm.register("itemId")} />
            <div className="loom-lists-inline-meta">
              <p className="loom-lists-inline-meta-line">
                {t("common.created", "Created")}: {formatDateTime(editingItem.createdAt)} {t("common.by", "by")} {editingItem.createdByName ?? t("common.unknown")}
              </p>
              <p className="loom-lists-inline-meta-line">
                {t("common.updated")}: {formatDateTime(editingItem.updatedAt)} {t("common.by", "by")}{" "}
                {editingItem.updatedByName ?? editingItem.createdByName ?? t("common.unknown")}
              </p>
            </div>
            <div className="loom-form-actions">
              <button className="loom-button-ghost" type="button" onClick={closeEdit}>
                {t("common.cancel")}
              </button>
              <button
                className="loom-button-ghost loom-signout-danger"
                type="button"
                onClick={() => confirmDeleteItem(editingItem.id)}
                disabled={deleteItemMutation.isPending}
              >
                {deleteItemMutation.isPending ? t("common.deleting", "Deleting...") : t("common.delete")}
              </button>
              <button className="loom-button-primary" type="submit" disabled={updateMutation.isPending}>
                {t("common.saveChanges")}
              </button>
            </div>
          </form>
        ) : null}

        {showComposer && pendingAddValues && similarItemSuggestions.length > 0 ? (
          <section className="loom-card p-4">
            <h3 className="loom-section-title">{t("lists.similarPopupTitle", "Similar items found")}</h3>
            <p className="loom-muted small">
              {t("lists.similarPopupBody", "Use one of these existing items instead of creating a duplicate?")}
            </p>
            <div className="loom-stack-sm">
              {similarItemSuggestions.map((entry) => (
                <button
                  key={entry.item.id}
                  type="button"
                  className="loom-item-suggestion-option"
                  onClick={() => mergeIntoExistingItem(entry.item.id, pendingAddValues)}
                >
                  <span className="loom-item-suggestion-name">{entry.item.text}</span>
                  <span className="loom-item-suggestion-meta">
                    {[entry.item.quantity, entry.item.category].filter(Boolean).join(" - ") || t("lists.form.noCategory")}
                  </span>
                </button>
              ))}
            </div>
            <div className="loom-form-actions mt-3">
              <button
                type="button"
                className="loom-button-ghost"
                onClick={() => {
                  setPendingAddValues(null);
                  setSimilarItemSuggestions([]);
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="loom-button-primary"
                onClick={() => {
                  submitNewItem(pendingAddValues);
                  setPendingAddValues(null);
                  setSimilarItemSuggestions([]);
                }}
              >
                {t("lists.addAsNew", "Add as new item")}
              </button>
            </div>
          </section>
        ) : null}
      </ResponsivePanel>

      <ResponsivePanel isOpen={showImportPanel} title={t("lists.importRecentPurchases", "Import recent purchases")} onClose={closeImportPanel}>
        <div className="loom-form-stack">
          {importRecentPurchasesMutation.error ? <p className="loom-feedback-error">{importRecentPurchasesMutation.error.message}</p> : null}
          <p className="loom-muted small m-0">
            {t(
              "lists.importRecentPurchasesHint",
              "Upload one or more supermarket receipt PDFs. Imported items will be added as completed entries with detected category and price."
            )}
          </p>

          <label className="loom-field">
            <span>{t("lists.importRecentPurchasesFiles", "Receipt PDFs")}</span>
            <input
              className="loom-input"
              type="file"
              accept="application/pdf,.pdf,image/*"
              multiple
              onChange={(event) => {
                setImportFiles(Array.from(event.target.files ?? []));
              }}
            />
          </label>

          <label className="loom-field">
            <span>{t("lists.importRecentPurchasesStore", "Supermarket (optional)")}</span>
            <input
              className="loom-input"
              type="text"
              value={importStoreHint}
              placeholder={t("lists.importRecentPurchasesStorePlaceholder", "Example: Continente")}
              onChange={(event) => setImportStoreHint(event.target.value)}
            />
          </label>

          {importFiles.length > 0 ? (
            <div className="loom-stack-sm">
              {importFiles.map((file) => (
                <p key={`${file.name}-${file.size}-${file.lastModified}`} className="loom-muted small m-0">
                  {file.name}
                </p>
              ))}
            </div>
          ) : null}

          <div className="loom-form-actions">
            <button className="loom-button-ghost" type="button" onClick={closeImportPanel}>
              {t("common.cancel")}
            </button>
            <button
              className="loom-button-primary"
              type="button"
              onClick={submitImportRecentPurchases}
              disabled={importRecentPurchasesMutation.isPending || importFiles.length === 0}
            >
              {importRecentPurchasesMutation.isPending
                ? t("lists.importRecentPurchasesLoading", "Importing recent purchases...")
                : t("lists.importRecentPurchasesAction", "Import PDFs")}
            </button>
          </div>
        </div>
      </ResponsivePanel>

      <button className="loom-lists-action-add" type="button" onClick={openAddPanel}>
        + {t("lists.addItem")}
      </button>

      {isSystemShoppingList ? (
        <button
          className="loom-button-ghost"
          type="button"
          onClick={() => setShowImportPanel(true)}
          disabled={importRecentPurchasesMutation.isPending}
        >
          {importRecentPurchasesMutation.isPending
            ? t("lists.importRecentPurchasesLoading", "Importing recent purchases...")
            : t("lists.importRecentPurchases", "Import recent purchases")}
        </button>
      ) : null}

      {canDelete ? (
        <button className="loom-lists-action-delete" type="button" onClick={confirmDeleteList} disabled={deleteListMutation.isPending}>
          {t("lists.deleteList")}
        </button>
      ) : null}
    </div>
  );
}

