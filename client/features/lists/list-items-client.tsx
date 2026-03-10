"use client";

import { useEffect, useMemo, useState } from "react";
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
  createdByUserId: string | null;
  createdByName: string | null;
  createdByAvatarUrl: string | null;
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

function getInitials(value: string | null) {
  if (!value) return "U";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
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
  const { t } = useI18n();
  const [showComposer, setShowComposer] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
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

    const groups = new Map<string, ListItem[]>();
    for (const item of activeItems) {
      const key = item.category?.trim() || "Uncategorized";
      const bucket = groups.get(key) ?? [];
      bucket.push(item);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => {
        if (left === "Uncategorized") return 1;
        if (right === "Uncategorized") return -1;
        return left.localeCompare(right);
      })
      .map(([key, groupedItems]) => ({
        key,
        label: categoryLabelMap.get(key.toLowerCase()) ?? (key === "Uncategorized" ? t("lists.uncategorized") : key),
        items: groupedItems
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

  function startEdit(item: ListItem) {
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
          setEditingItemId(null);
          editForm.reset({ itemId: "", text: "", quantity: "", category: "" });
        }
      }
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
            {group.items.map((item) => (
              <div key={item.id} className="loom-lists-detail-row">
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  onChange={() => updateMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                />

                <span className="loom-lists-detail-main">
                  <span className="loom-lists-detail-name">{item.text}</span>
                  {item.quantity ? <span className="loom-lists-detail-qty">{item.quantity}</span> : null}
                </span>

                <span className="loom-inline-actions">
                  <span
                    className={`loom-lists-participant ${item.createdByAvatarUrl ? "has-image" : ""}`}
                    style={item.createdByAvatarUrl ? { backgroundImage: `url(${item.createdByAvatarUrl})` } : undefined}
                    title={item.createdByName ?? "Member"}
                  >
                    {item.createdByAvatarUrl ? null : getInitials(item.createdByName)}
                  </span>
                  <button type="button" className="loom-plain-button" onClick={() => startEdit(item)}>{t("common.edit")}</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {completedItems.length > 0 ? (
        <section className="loom-stack-sm">
          <p className="loom-lists-section-title">{t("lists.completed")}</p>
          <div className="loom-lists-detail-card">
            {completedItems.map((item) => (
              <div key={item.id} className="loom-lists-detail-row">
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  onChange={() => updateMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
                />

                <span className="loom-lists-detail-main">
                  <span className="loom-lists-detail-name loom-home-line-through">{item.text}</span>
                  {item.quantity ? <span className="loom-lists-detail-qty">{item.quantity}</span> : null}
                </span>

                <span className="loom-inline-actions">
                  <span
                    className={`loom-lists-participant ${item.createdByAvatarUrl ? "has-image" : ""}`}
                    style={item.createdByAvatarUrl ? { backgroundImage: `url(${item.createdByAvatarUrl})` } : undefined}
                    title={item.createdByName ?? "Member"}
                  >
                    {item.createdByAvatarUrl ? null : getInitials(item.createdByName)}
                  </span>
                  <button type="button" className="loom-plain-button" onClick={() => startEdit(item)}>{t("common.edit")}</button>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {editingItemId ? (
        <section className="loom-card p-4">
          <form className="loom-form-stack" onSubmit={editForm.handleSubmit(submitEdit)}>
            <div className="loom-lists-quick-add">
              <input className="loom-input" type="text" placeholder={t("lists.form.itemName")} {...editForm.register("text")} />
              <input className="loom-input" type="text" placeholder={t("lists.form.quantity")} {...editForm.register("quantity")} />
              <select className="loom-input" {...editForm.register("category")}>
                <option value="">{t("lists.form.noCategory")}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabelMap.get(category.toLowerCase()) ?? category}
                  </option>
                ))}
              </select>
              <input type="hidden" {...editForm.register("itemId")} />
              <div className="loom-form-actions">
                <button className="loom-button-ghost" type="button" onClick={() => setEditingItemId(null)}>
                  {t("common.cancel")}
                </button>
                <button className="loom-button-primary" type="submit" disabled={updateMutation.isPending}>
                  {t("common.saveChanges")}
                </button>
              </div>
            </div>
          </form>
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
