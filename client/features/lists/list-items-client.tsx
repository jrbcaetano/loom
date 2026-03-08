"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const addItemSchema = z.object({
  text: z.string().trim().min(1).max(240),
  quantity: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional()
});

type AddItemValues = z.infer<typeof addItemSchema>;

type ListItem = {
  id: string;
  text: string;
  quantity: string | null;
  category: string | null;
  isCompleted: boolean;
  sortOrder: number;
};

async function fetchListItems(listId: string) {
  const response = await fetch(`/api/lists/${listId}/items`, { cache: "no-store" });
  const payload = (await response.json()) as { items: ListItem[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load list items");
  }

  return payload.items;
}

export function ListItemsClient({ listId }: { listId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<AddItemValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { text: "", quantity: "", category: "" }
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

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/lists/${listId}/items?itemId=${itemId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete item");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
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

  return (
    <div className="loom-stack">
      <form className="loom-form-inline" onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}>
        <input className="loom-input" type="text" placeholder="Add item" {...form.register("text")} />
        <input className="loom-input" type="text" placeholder="Qty" {...form.register("quantity")} />
        <input className="loom-input" type="text" placeholder="Category" {...form.register("category")} />
        <button className="loom-button-primary" type="submit" disabled={addMutation.isPending}>
          Add
        </button>
      </form>

      {form.formState.errors.text ? <p className="loom-feedback-error">{form.formState.errors.text.message}</p> : null}
      {addMutation.error ? <p className="loom-feedback-error">{addMutation.error.message}</p> : null}

      {isPending ? <p className="loom-muted">Loading items...</p> : null}
      {error ? <p className="loom-feedback-error">{error.message}</p> : null}

      <ul className="loom-list-items">
        {(items ?? []).map((item) => (
          <li key={item.id} className="loom-list-item-row">
            <button
              className={`loom-check ${item.isCompleted ? "is-done" : ""}`}
              type="button"
              onClick={() => updateMutation.mutate({ itemId: item.id, isCompleted: !item.isCompleted })}
            >
              {item.isCompleted ? "Done" : "Open"}
            </button>

            <div className="loom-list-item-main">
              <p className={`loom-list-item-text ${item.isCompleted ? "is-done" : ""}`}>{item.text}</p>
              <p className="loom-muted small">
                {item.quantity ?? "-"} {item.category ? `- ${item.category}` : ""}
              </p>
            </div>

            <button className="loom-button-ghost" type="button" onClick={() => deleteMutation.mutate(item.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
