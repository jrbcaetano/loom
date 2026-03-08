import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const documentSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  fileUrl: z.string().trim().max(2000).optional().nullable()
});

export async function getDocuments(familyId: string, search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select("id, family_id, title, description, category, file_url, created_by, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (search && search.trim()) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDocumentById(documentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createDocument(input: unknown) {
  const parsed = documentSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("documents")
    .insert({
      family_id: parsed.familyId,
      title: parsed.title,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      file_url: parsed.fileUrl ?? null,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateDocument(documentId: string, input: unknown) {
  const parsed = documentSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      file_url: parsed.fileUrl ?? null
    })
    .eq("id", documentId);

  if (error) throw new Error(error.message);
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
}
