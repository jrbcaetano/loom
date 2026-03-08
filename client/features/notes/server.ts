import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const noteSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1),
  category: z.string().trim().max(120).optional().nullable()
});

export async function getNotes(familyId: string, search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .select("id, family_id, title, content, category, created_by, updated_at")
    .eq("family_id", familyId)
    .order("updated_at", { ascending: false });

  if (search && search.trim()) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getNoteById(noteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createNote(input: unknown) {
  const parsed = noteSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("notes")
    .insert({
      family_id: parsed.familyId,
      title: parsed.title,
      content: parsed.content,
      category: parsed.category ?? null,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateNote(noteId: string, input: unknown) {
  const parsed = noteSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({ title: parsed.title, content: parsed.content, category: parsed.category ?? null })
    .eq("id", noteId);
  if (error) throw new Error(error.message);
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
}
