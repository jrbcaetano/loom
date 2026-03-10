"use client";

import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

const addItemSchema = z.object({
  text: z.string().trim().min(1).max(240),
  quantity: z.string().trim().max(120).optional(),
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

function mixRgb(from: readonly [number, number, number], to: readonly [number, number, number], progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = Math.round(from[0] + (to[0] - from[0]) * clamped);
  const g = Math.round(from[1] + (to[1] - from[1]) * clamped);
  const b = Math.round(from[2] + (to[2] - from[2]) * clamped);
  return `rgb(${r} ${g} ${b})`;
}

const ACTIVE_ROW_COLOR: readonly [number, number, number] = [255, 255, 255];
const COMPLETED_ROW_COLOR: readonly [number, number, number] = [243, 245, 247];

function getRowBackgroundColor(isCompletedSection: boolean, swipeOffset: number) {
  if (!swipeOffset) {
    return isCompletedSection ? mixRgb(COMPLETED_ROW_COLOR, COMPLETED_ROW_COLOR, 1) : mixRgb(ACTIVE_ROW_COLOR, ACTIVE_ROW_COLOR, 1);
  }

  const progress = Math.min(1, Math.abs(swipeOffset) / 88);
  return isCompletedSection
    ? mixRgb(COMPLETED_ROW_COLOR, ACTIVE_ROW_COLOR, progress)
    : mixRgb(ACTIVE_ROW_COLOR, COMPLETED_ROW_COLOR, progress);
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
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
    defaultValues: { text: "", quantity: "", category: "" }
  });

  const editForm = useForm<EditItemValues>({
    resolver: zodResolver(editItemSchema),
    defaultValues: { itemId: "", text: "", quantity: "", category: "" }
  });

  const queryKey = ["list-items", listId] as const;

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
      form.reset({ text: "", quantity: "", category: "" });
      setShowComposer(false);
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

  const activeItems = (items ?? []).filter((item) => !item.isCompleted);
  const completedItems = (items ?? []).filter((item) => item.isCompleted);
  const categoryLabelMap = useMemo(() => new Map(categories.map((category) => [category.value.toLowerCase(), category.label])), [categories]);
  const categoryOptions = useMemo(() => {
    const values = [...categories.map((category) => category.value), ...(items ?? []).map((item) => item.category ?? "")];
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  }, [categories, items]);

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

  function applyCategorySuggestion(itemName: string) {
    const suggestedCategory = categoryMemory.get(normalizeItemName(itemName));
    const currentCategory = form.getValues("category")?.trim();

    if (suggestedCategory && categoryOptions.some((value) => value.toLowerCase() === suggestedCategory.toLowerCase()) && !currentCategory) {
      form.setValue("category", suggestedCategory, { shouldDirty: true });
      return suggestedCategory;
    }

    return suggestedCategory;
  }

  const textField = form.register("text");

  function onSubmit(values: AddItemValues) {
    const suggestedCategory = applyCategorySuggestion(values.text);

    addMutation.mutate({
      ...values,
      category: values.category?.trim() || suggestedCategory || undefined
    });
  }

  function closeEdit() {
    setEditingItemId(null);
    editForm.reset({ itemId: "", text: "", quantity: "", category: "" });
  }

  function startEdit(item: ListItem) {
    if (editingItemId === item.id) {
      closeEdit();
      return;
    }

    setEditingItemId(item.id);
    editForm.reset({
      itemId: item.id,
      text: item.text,
      quantity: item.quantity ?? "",
      category: item.category ?? ""
    });
  }

  function submitEdit(values: EditItemValues) {
    updateMutation.mutate(
      {
        itemId: values.itemId,
        text: values.text,
        quantity: values.quantity?.trim() || null,
        category: values.category?.trim() || null
      },
      {
        onSuccess: () => {
          closeEdit();
        }
      }
    );
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

  function handleRowTouchStart(event: TouchEvent<HTMLDivElement>, itemId: string, isCompletedSection: boolean) {
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

  function handleRowTouchMove(event: TouchEvent<HTMLDivElement>) {
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

  function renderItemRow(item: ListItem, isCompletedSection: boolean) {
    const rawCategory = item.category?.trim() || null;
    const displayCategory = rawCategory ? (categoryLabelMap.get(rawCategory.toLowerCase()) ?? rawCategory) : null;
    const { level2 } = splitCategoryLevels(displayCategory);
    const isEditing = editingItemId === item.id;
    const swipeOffset = swipePreview?.itemId === item.id ? swipePreview.offset : 0;
    const quantityState = parseQuantityForQuickAdjust(item.quantity);
    const createdBy = item.createdByName ?? t("common.unknown");
    const updatedBy = item.updatedByName ?? item.createdByName ?? t("common.unknown");
    const swipeProgress = Math.min(1, Math.abs(swipeOffset) / 88);
    const rowBackgroundColor = getRowBackgroundColor(isCompletedSection, swipeOffset);
    const rowStyle: { transform?: string; backgroundColor: string } = {
      backgroundColor: rowBackgroundColor
    };
    if (swipeOffset) {
      rowStyle.transform = `translateX(${swipeOffset}px)`;
    }

    return (
      <div key={item.id} className={`loom-lists-detail-row-shell ${isEditing ? "is-editing" : ""}`}>
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
            </span>

            <span className="loom-inline-actions">
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

        {isEditing ? (
          <form className="loom-lists-inline-edit" onSubmit={editForm.handleSubmit(submitEdit)}>
            <label className="loom-lists-inline-field">
              <span className="loom-lists-inline-label">{t("lists.form.itemName")}</span>
              <input className="loom-input" type="text" {...editForm.register("text")} />
            </label>
            <label className="loom-lists-inline-field">
              <span className="loom-lists-inline-label">{t("lists.form.quantity")}</span>
              <input className="loom-input" type="text" {...editForm.register("quantity")} />
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
                {t("common.created", "Created")}: {formatDateTime(item.createdAt)} {t("common.by", "by")} {createdBy}
              </p>
              <p className="loom-lists-inline-meta-line">
                {t("common.updated")}: {formatDateTime(item.updatedAt)} {t("common.by", "by")} {updatedBy}
              </p>
            </div>

            <div className="loom-form-actions">
              <button className="loom-button-ghost" type="button" onClick={closeEdit}>
                {t("common.cancel")}
              </button>
              <button className="loom-button-primary" type="submit" disabled={updateMutation.isPending}>
                {t("common.saveChanges")}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  function confirmDeleteList() {
    if (!canDelete) return;
    if (!window.confirm(t("lists.deleteConfirm"))) return;
    deleteListMutation.mutate();
  }

  return (
    <div className="loom-stack">
      <p className="loom-lists-detail-summary">
        {activeItems.length} {t("lists.remaining")} - {completedItems.length} {t("lists.completed")}
      </p>

      {form.formState.errors.text ? <p className="loom-feedback-error">{form.formState.errors.text.message}</p> : null}
      {addMutation.error ? <p className="loom-feedback-error">{addMutation.error.message}</p> : null}
      {updateMutation.error ? <p className="loom-feedback-error">{updateMutation.error.message}</p> : null}
      {deleteListMutation.error ? <p className="loom-feedback-error">{deleteListMutation.error.message}</p> : null}
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
          <p className="loom-lists-section-title">{t("lists.completed")}</p>
          <div className="loom-lists-detail-card">
            {completedItems.map((item) => renderItemRow(item, true))}
          </div>
        </section>
      ) : null}

      {showComposer ? (
        <section className="loom-card p-4">
          <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="loom-lists-quick-add">
              <input
                className="loom-input"
                type="text"
                placeholder={t("lists.form.itemName")}
                {...textField}
                onBlur={(event) => {
                  textField.onBlur(event);
                  applyCategorySuggestion(event.target.value);
                }}
              />
              <input className="loom-input" type="text" placeholder={t("lists.form.quantity")} {...form.register("quantity")} />
              <select className="loom-input" {...form.register("category")}>
                <option value="">{t("lists.form.noCategory")}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabelMap.get(category.toLowerCase()) ?? category}
                  </option>
                ))}
              </select>
              {categoryOptions.length === 0 ? <p className="loom-muted small m-0">{t("lists.noCategoriesConfigured")}</p> : null}
              <button className="loom-button-primary" type="submit" disabled={addMutation.isPending}>
                {t("lists.saveItem")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button className="loom-lists-action-add" type="button" onClick={() => setShowComposer((value) => !value)}>
        + {t("lists.addItem")}
      </button>

      {canDelete ? (
        <button className="loom-lists-action-delete" type="button" onClick={confirmDeleteList} disabled={deleteListMutation.isPending}>
          {t("lists.deleteList")}
        </button>
      ) : null}
    </div>
  );
}
