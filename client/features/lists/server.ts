import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { nonEmptyTextSchema, visibilitySchema } from "@/features/shared/validation";
import type { AppLocale } from "@/lib/i18n/config";
import { SHOPPING_LIST_CATEGORY_DEFAULTS, type ReferenceValue } from "@/config/reference-data";
import { SYSTEM_SHOPPING_LIST_TITLE, isSystemShoppingListTitle } from "@/features/lists/display";

export type ListSummary = {
  id: string;
  title: string;
  description: string | null;
  visibility: "private" | "family" | "selected_members";
  archived: boolean;
  updatedAt: string;
  ownerUserId: string;
  isSystemShoppingList: boolean;
};

export type ListItem = {
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

export type ListDetail = {
  id: string;
  title: string;
  description: string | null;
  visibility: "private" | "family" | "selected_members";
  familyId: string;
  ownerUserId: string;
  isSystemShoppingList: boolean;
  categories: Array<{
    value: string;
    label: string;
    translations: Record<string, string>;
  }>;
  items: ListItem[];
};

export type ListOverview = ListSummary & {
  totalItems: number;
  completedItems: number;
  remainingItems: number;
  participants: Array<{
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
  }>;
};

const DEFAULT_SHOPPING_LIST_CATEGORIES = SHOPPING_LIST_CATEGORY_DEFAULTS;

const listSchema = z.object({
  familyId: z.string().uuid(),
  title: nonEmptyTextSchema.max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  visibility: visibilitySchema,
  categories: z
    .array(
      z.object({
        value: nonEmptyTextSchema.max(120),
        translations: z.record(z.string(), z.string().trim().max(120)).optional()
      })
    )
    .optional(),
  selectedMemberIds: z.array(z.string().uuid()).optional()
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

function normalizeListItemText(value: string) {
  return value.trim().toLocaleLowerCase();
}

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user.id;
}

function normalizeCategories(categories: ReferenceValue[]) {
  const unique = new Map<string, ReferenceValue>();

  for (const category of categories) {
    const trimmed = category.value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const current = unique.get(key) ?? { value: trimmed, translations: {} };
    const mergedTranslations = { ...current.translations, ...(category.translations ?? {}) };
    unique.set(key, {
      value: trimmed,
      translations: mergedTranslations
    });
  }

  for (const [key, category] of unique.entries()) {
    const cleanedTranslations: Record<string, string> = {};
    for (const [locale, label] of Object.entries(category.translations ?? {})) {
      const normalizedLabel = label.trim();
      if (!normalizedLabel || normalizedLabel.toLowerCase() === key) continue;
      cleanedTranslations[locale] = normalizedLabel;
    }
    category.translations = cleanedTranslations;
  }

  return Array.from(unique.values());
}

async function getListCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  locale: AppLocale = "en"
): Promise<Array<{ value: string; label: string; translations: Record<string, string> }>> {
  const { data, error } = await supabase
    .from("list_categories")
    .select("id, name, list_category_translations(locale, label)")
    .eq("list_id", listId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const translations = Object.fromEntries((row.list_category_translations ?? []).map((item) => [item.locale, item.label])) as Record<string, string>;
    return {
      value: row.name,
      label: translations[locale] ?? row.name,
      translations
    };
  });
}

async function syncListCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  categories: ReferenceValue[],
  userId: string
) {
  const normalized = normalizeCategories(categories);

  const { error: deleteError } = await supabase.from("list_categories").delete().eq("list_id", listId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (normalized.length === 0) {
    return;
  }

  const rows = normalized.map((category) => ({
    list_id: listId,
    name: category.value,
    created_by: userId
  }));

  const { data: insertedCategories, error: insertError } = await supabase.from("list_categories").insert(rows).select("id, name");
  if (insertError || !insertedCategories) {
    throw new Error(insertError.message);
  }

  const categoryByValue = new Map(normalized.map((item) => [item.value.toLowerCase(), item]));
  const translationRows: Array<{
    list_category_id: string;
    locale: string;
    label: string;
    created_by: string;
  }> = [];

  for (const insertedCategory of insertedCategories) {
    const config = categoryByValue.get(insertedCategory.name.toLowerCase());
    if (!config) continue;

    for (const [locale, label] of Object.entries(config.translations ?? {})) {
      const trimmed = label.trim();
      if (!trimmed) continue;
      translationRows.push({
        list_category_id: insertedCategory.id,
        locale,
        label: trimmed,
        created_by: userId
      });
    }
  }

  if (translationRows.length > 0) {
    const { error: translationError } = await supabase.from("list_category_translations").insert(translationRows);
    if (translationError) {
      throw new Error(translationError.message);
    }
  }
}

async function resolveAllowedCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  category: string | null | undefined
) {
  const trimmed = category?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const categories = await getListCategories(supabase, listId);
  if (categories.length === 0) {
    throw new Error("No categories configured for this list. Add categories in list settings first.");
  }

  const match = categories.find((value) => value.value.toLowerCase() === trimmed.toLowerCase());
  if (!match) {
    throw new Error("Invalid category for this list.");
  }

  return match.value;
}

async function ensureShoppingListExists(supabase: Awaited<ReturnType<typeof createClient>>, familyId: string) {
  const userId = await currentUserId(supabase);
  const { data: existing, error } = await supabase
    .from("lists")
    .select("id, title")
    .eq("family_id", familyId)
    .eq("archived", false);

  if (error) {
    throw new Error(error.message);
  }

  const shoppingList = (existing ?? []).find((row) => isSystemShoppingListTitle(row.title));
  if (shoppingList) {
    const configured = await getListCategories(supabase, shoppingList.id);
    if (configured.length === 0) {
      await syncListCategories(supabase, shoppingList.id, DEFAULT_SHOPPING_LIST_CATEGORIES, userId);
    }
    return;
  }

  const { data: listId, error: createError } = await supabase.rpc("create_list_with_shares", {
    target_family_id: familyId,
    list_title: SYSTEM_SHOPPING_LIST_TITLE,
    list_description: "System shared shopping list",
    list_visibility: "family",
    selected_member_ids: []
  });

  if (createError) {
    throw new Error(createError.message);
  }

  if (typeof listId === "string") {
    await syncListCategories(supabase, listId, DEFAULT_SHOPPING_LIST_CATEGORIES, userId);
  }
}

async function getFamilyAllowMultipleLists(supabase: Awaited<ReturnType<typeof createClient>>, familyId: string) {
  const { data, error } = await supabase.from("families").select("allow_multiple_lists").eq("id", familyId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.allow_multiple_lists ?? true;
}

export async function getShoppingListIdForFamily(familyId: string): Promise<string | null> {
  const supabase = await createClient();
  await ensureShoppingListExists(supabase, familyId);
  const lists = await getListsForFamily(familyId);
  return lists.find((list) => list.isSystemShoppingList)?.id ?? null;
}

export async function isMultipleListsEnabledForFamily(familyId: string): Promise<boolean> {
  const supabase = await createClient();
  return getFamilyAllowMultipleLists(supabase, familyId);
}

export async function getListsForFamily(familyId: string): Promise<ListSummary[]> {
  const supabase = await createClient();
  await ensureShoppingListExists(supabase, familyId);
  const allowMultipleLists = await getFamilyAllowMultipleLists(supabase, familyId);

  const { data, error } = await supabase
    .from("lists")
    .select("id, title, description, visibility, archived, updated_at, owner_user_id")
    .eq("family_id", familyId)
    .eq("archived", false)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const mapped = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    archived: row.archived,
    updatedAt: row.updated_at,
    ownerUserId: row.owner_user_id,
    isSystemShoppingList: isSystemShoppingListTitle(row.title)
  }));

  const visibleLists = allowMultipleLists ? mapped : mapped.filter((list) => list.isSystemShoppingList);

  return visibleLists.sort((left, right) => {
    if (left.isSystemShoppingList && !right.isSystemShoppingList) return -1;
    if (!left.isSystemShoppingList && right.isSystemShoppingList) return 1;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export async function getRecentLists(familyId: string, limit = 5): Promise<ListSummary[]> {
  return (await getListsForFamily(familyId)).slice(0, limit);
}

export async function getListsWithStatsForFamily(familyId: string): Promise<ListOverview[]> {
  const supabase = await createClient();
  const lists = await getListsForFamily(familyId);

  if (lists.length === 0) {
    return [];
  }

  const listIds = lists.map((list) => list.id);

  const { data: itemRows, error: itemsError } = await supabase
    .from("list_items")
    .select("id, list_id, is_completed, created_by")
    .in("list_id", listIds);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const participantIds = Array.from(new Set((itemRows ?? []).map((row) => row.created_by).filter(Boolean))) as string[];
  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();

  if (participantIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", participantIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      });
    }
  }

  const statsByListId = new Map<
    string,
    {
      totalItems: number;
      completedItems: number;
      participantIds: Set<string>;
    }
  >();

  for (const row of itemRows ?? []) {
    const current = statsByListId.get(row.list_id) ?? { totalItems: 0, completedItems: 0, participantIds: new Set<string>() };
    current.totalItems += 1;
    if (row.is_completed) {
      current.completedItems += 1;
    }
    if (row.created_by) {
      current.participantIds.add(row.created_by);
    }
    statsByListId.set(row.list_id, current);
  }

  return lists.map((list) => {
    const stats = statsByListId.get(list.id) ?? { totalItems: 0, completedItems: 0, participantIds: new Set<string>() };
    const participants = Array.from(stats.participantIds)
      .slice(0, 4)
      .map((userId) => ({
        userId,
        fullName: profileMap.get(userId)?.full_name ?? null,
        avatarUrl: profileMap.get(userId)?.avatar_url ?? null
      }));

    return {
      ...list,
      totalItems: stats.totalItems,
      completedItems: stats.completedItems,
      remainingItems: Math.max(0, stats.totalItems - stats.completedItems),
      participants
    };
  });
}

export async function getListById(listId: string, locale: AppLocale = "en"): Promise<ListDetail | null> {
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

  const categories = await getListCategories(supabase, listId, locale);

  const { data: items, error: itemsError } = await supabase
    .from("list_items")
    .select("id, text, quantity, category, is_completed, sort_order, created_by, updated_by, created_at, updated_at")
    .eq("list_id", listId)
    .order("is_completed", { ascending: true })
    .order("sort_order", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const profileIds = Array.from(
    new Set((items ?? []).flatMap((item) => [item.created_by, item.updated_by]).filter(Boolean))
  ) as string[];
  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", profileIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, { full_name: profile.full_name, avatar_url: profile.avatar_url });
    }
  }

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    visibility: list.visibility,
    familyId: list.family_id,
    ownerUserId: list.owner_user_id,
    isSystemShoppingList: isSystemShoppingListTitle(list.title),
    categories,
    items: (items ?? []).map((item) => ({
      id: item.id,
      text: item.text,
      quantity: item.quantity,
      category: item.category,
      isCompleted: item.is_completed,
      sortOrder: item.sort_order,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      createdByUserId: item.created_by,
      createdByName: item.created_by ? (profileMap.get(item.created_by)?.full_name ?? null) : null,
      createdByAvatarUrl: item.created_by ? (profileMap.get(item.created_by)?.avatar_url ?? null) : null,
      updatedByUserId: item.updated_by,
      updatedByName: item.updated_by ? (profileMap.get(item.updated_by)?.full_name ?? null) : null,
      updatedByAvatarUrl: item.updated_by ? (profileMap.get(item.updated_by)?.avatar_url ?? null) : null
    }))
  };
}

export async function createList(input: unknown) {
  const parsed = listSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const allowMultipleLists = await getFamilyAllowMultipleLists(supabase, parsed.familyId);
  if (!allowMultipleLists) {
    throw new Error("Multiple lists are disabled for this family.");
  }
  const { data, error } = await supabase.rpc("create_list_with_shares", {
    target_family_id: parsed.familyId,
    list_title: parsed.title,
    list_description: parsed.description ?? null,
    list_visibility: parsed.visibility,
    selected_member_ids: parsed.visibility === "selected_members" ? (parsed.selectedMemberIds ?? []) : []
  });

  if (error || !data) {
    if (error?.code === "PGRST202" || error?.code === "PGRST205") {
      throw new Error("List creation RPC not found. Re-run latest migration.");
    }
    throw new Error(error?.message ?? "Failed to create list");
  }

  const listId = data as string;
  await syncListCategories(supabase, listId, parsed.categories ?? [], userId);

  return listId;
}

export async function updateList(listId: string, input: unknown) {
  const parsed = listSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing, error: existingError } = await supabase.from("lists").select("id, family_id, title").eq("id", listId).single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const isSystemShoppingList = isSystemShoppingListTitle(existing.title);
  if (isSystemShoppingList && parsed.visibility && parsed.visibility !== "family") {
    throw new Error("Shopping List visibility is always family.");
  }
  if (isSystemShoppingList && parsed.title && !isSystemShoppingListTitle(parsed.title)) {
    throw new Error("Shopping List name cannot be changed.");
  }

  const listUpdatePayload: Record<string, unknown> = {
    updated_by: userId
  };

  if (isSystemShoppingList) {
    listUpdatePayload.title = SYSTEM_SHOPPING_LIST_TITLE;
    listUpdatePayload.visibility = "family";
  } else {
    if (parsed.title !== undefined) listUpdatePayload.title = parsed.title;
    if (parsed.visibility !== undefined) listUpdatePayload.visibility = parsed.visibility;
  }

  if (parsed.description !== undefined) {
    listUpdatePayload.description = parsed.description ?? null;
  }

  const { error } = await supabase.from("lists").update(listUpdatePayload).eq("id", listId);

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

  if (parsed.categories !== undefined) {
    await syncListCategories(supabase, listId, parsed.categories, userId);
  }
}

export async function archiveList(listId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing, error: existingError } = await supabase.from("lists").select("title").eq("id", listId).single();
  if (existingError) {
    throw new Error(existingError.message);
  }
  if (isSystemShoppingListTitle(existing.title)) {
    throw new Error("Shopping List cannot be deleted.");
  }

  const { error } = await supabase.from("lists").update({ archived: true, updated_by: userId }).eq("id", listId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addListItem(input: unknown) {
  const parsed = listItemSchema.parse(input);
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  const category = await resolveAllowedCategory(supabase, parsed.listId, parsed.category ?? null);
  const normalizedTargetText = normalizeListItemText(parsed.text);

  const { data: existingItems, error: existingItemsError } = await supabase
    .from("list_items")
    .select("id, text")
    .eq("list_id", parsed.listId);

  if (existingItemsError) {
    throw new Error(existingItemsError.message);
  }

  const matchingItem = (existingItems ?? []).find((item) => normalizeListItemText(item.text) === normalizedTargetText);
  if (matchingItem) {
    const { error: updateError } = await supabase
      .from("list_items")
      .update({
        quantity: parsed.quantity ?? null,
        category,
        is_completed: false,
        completed_at: null,
        completed_by: null,
        updated_by: userId
      })
      .eq("id", matchingItem.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return matchingItem.id;
  }

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
      category,
      created_by: userId,
      updated_by: userId,
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
  payload.updated_by = userId;

  if (typeof parsed.text === "string") payload.text = parsed.text;
  if (parsed.quantity !== undefined) payload.quantity = parsed.quantity;
  if (parsed.category !== undefined) {
    const { data: existingItem, error: existingItemError } = await supabase.from("list_items").select("list_id").eq("id", parsed.itemId).single();

    if (existingItemError) {
      throw new Error(existingItemError.message);
    }

    payload.category = await resolveAllowedCategory(supabase, existingItem.list_id, parsed.category);
  }
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
