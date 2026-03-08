import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nonEmptyTextSchema, visibilitySchema } from "@/features/shared/validation";

export type ListSummary = {
  id: string;
  title: string;
  description: string | null;
  visibility: "private" | "family" | "selected_members";
  archived: boolean;
  updatedAt: string;
  ownerUserId: string;
};

export type ListItem = {
  id: string;
  text: string;
  quantity: string | null;
  category: string | null;
  isCompleted: boolean;
  sortOrder: number;
};

export type ListDetail = {
  id: string;
  title: string;
  description: string | null;
  visibility: "private" | "family" | "selected_members";
  familyId: string;
  ownerUserId: string;
  items: ListItem[];
};

const listSchema = z.object({
  familyId: z.string().uuid(),
  title: nonEmptyTextSchema.max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  visibility: visibilitySchema,
  selectedMemberIds: z.array(z.string().uuid()).optional().default([])
});

const listItemSchema = z.object({
  listId: z.string().uuid(),
  text: nonEmptyTextSchema.max(240),
  quantity: z.string().trim().max(120).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable()
});

const listItemUpdateSchema = z.object({
  itemId: z.string().uuid(),
  text: z.string().trim().max(240).optional(),
  quantity: z.string().trim().max(120).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  isCompleted: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional()
});

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user.id;
}

export async function getListsForFamily(familyId: string): Promise<ListSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .select("id, title, description, visibility, archived, updated_at, owner_user_id")
    .eq("family_id", familyId)
    .eq("archived", false)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    archived: row.archived,
    updatedAt: row.updated_at,
    ownerUserId: row.owner_user_id
  }));
}

export async function getRecentLists(familyId: string, limit = 5): Promise<ListSummary[]> {
  return (await getListsForFamily(familyId)).slice(0, limit);
}

export async function getListById(listId: string): Promise<ListDetail | null> {
  const supabase = await createClient();
  const { data: list, error } = await supabase
    .from("lists")
    .select("id, title, description, visibility, family_id, owner_user_id")
    .eq("id", listId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!list) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("list_items")
    .select("id, text, quantity, category, is_completed, sort_order")
    .eq("list_id", listId)
    .order("is_completed", { ascending: true })
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    visibility: list.visibility,
    familyId: list.family_id,
    ownerUserId: list.owner_user_id,
    items: (items ?? []).map((item) => ({
      id: item.id,
      text: item.text,
      quantity: item.quantity,
      category: item.category,
      isCompleted: item.is_completed,
      sortOrder: item.sort_order
    }))
  };
}

export async function createList(input: unknown) {
  const parsed = listSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_list_with_shares", {
    target_family_id: parsed.familyId,
    list_title: parsed.title,
    list_description: parsed.description ?? null,
    list_visibility: parsed.visibility,
    selected_member_ids: parsed.visibility === "selected_members" ? parsed.selectedMemberIds : []
  });

  if (error || !data) {
    if (error?.code === "PGRST202" || error?.code === "PGRST205") {
      throw new Error("List creation RPC not found. Re-run latest migration.");
    }
    throw new Error(error?.message ?? "Failed to create list");
  }

  return data as string;
}

export async function updateList(listId: string, input: unknown) {
  const parsed = listSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing, error: existingError } = await supabase.from("lists").select("id, family_id").eq("id", listId).single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const { error } = await supabase
    .from("lists")
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      visibility: parsed.visibility,
      updated_by: userId
    })
    .eq("id", listId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("entity_shares").delete().eq("entity_type", "list").eq("entity_id", listId);

  if (parsed.visibility === "selected_members" && parsed.selectedMemberIds && parsed.selectedMemberIds.length > 0) {
    const rows = parsed.selectedMemberIds.map((memberId) => ({
      family_id: existing.family_id,
      entity_type: "list" as const,
      entity_id: listId,
      shared_with_user_id: memberId,
      permission: "edit" as const,
      created_by: userId
    }));

    const { error: shareError } = await supabase.from("entity_shares").insert(rows);
    if (shareError) {
      throw new Error(shareError.message);
    }
  }
}

export async function archiveList(listId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const { error } = await supabase.from("lists").update({ archived: true, updated_by: userId }).eq("id", listId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addListItem(input: unknown) {
  const parsed = listItemSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { count: itemCount } = await supabase
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("list_id", parsed.listId);

  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: parsed.listId,
      text: parsed.text,
      quantity: parsed.quantity ?? null,
      category: parsed.category ?? null,
      created_by: userId,
      sort_order: itemCount ?? 0
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

export async function updateListItem(input: unknown) {
  const parsed = listItemUpdateSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const payload: Record<string, unknown> = {};

  if (typeof parsed.text === "string") payload.text = parsed.text;
  if (parsed.quantity !== undefined) payload.quantity = parsed.quantity;
  if (parsed.category !== undefined) payload.category = parsed.category;
  if (typeof parsed.sortOrder === "number") payload.sort_order = parsed.sortOrder;

  if (typeof parsed.isCompleted === "boolean") {
    payload.is_completed = parsed.isCompleted;
    payload.completed_at = parsed.isCompleted ? new Date().toISOString() : null;
    payload.completed_by = parsed.isCompleted ? userId : null;
  }

  const { error } = await supabase.from("list_items").update(payload).eq("id", parsed.itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteListItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("list_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(error.message);
  }
}
