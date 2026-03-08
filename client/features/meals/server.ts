import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const recipeSchema = z.object({
  familyId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  instructions: z.string().trim().max(10000).optional().nullable(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(180),
        quantity: z.string().trim().max(120).optional().nullable(),
        unit: z.string().trim().max(40).optional().nullable()
      })
    )
    .default([])
});

const mealEntrySchema = z.object({
  familyId: z.string().uuid(),
  recipeId: z.string().uuid().optional().nullable(),
  date: z.string().date(),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
  notes: z.string().trim().max(1000).optional().nullable()
});

export async function getRecipes(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, family_id, title, description, instructions, created_by, created_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRecipeById(recipeId: string) {
  const supabase = await createClient();
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id, family_id, title, description, instructions, created_by, created_at")
    .eq("id", recipeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!recipe) return null;

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("id, name, quantity, unit")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: true });

  if (ingredientsError) throw new Error(ingredientsError.message);

  return {
    ...recipe,
    ingredients: ingredients ?? []
  };
}

export async function createRecipe(input: unknown) {
  const parsed = recipeSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      family_id: parsed.familyId,
      title: parsed.title,
      description: parsed.description ?? null,
      instructions: parsed.instructions ?? null,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (parsed.ingredients.length > 0) {
    const rows = parsed.ingredients.map((ingredient) => ({
      recipe_id: data.id,
      name: ingredient.name,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null
    }));

    const { error: ingredientError } = await supabase.from("recipe_ingredients").insert(rows);
    if (ingredientError) throw new Error(ingredientError.message);
  }

  return data.id;
}

export async function updateRecipe(recipeId: string, input: unknown) {
  const parsed = recipeSchema.partial({ familyId: true }).parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("recipes")
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      instructions: parsed.instructions ?? null
    })
    .eq("id", recipeId);

  if (error) throw new Error(error.message);

  if (parsed.ingredients) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

    if (parsed.ingredients.length > 0) {
      const rows = parsed.ingredients.map((ingredient) => ({
        recipe_id: recipeId,
        name: ingredient.name,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null
      }));
      const { error: ingredientError } = await supabase.from("recipe_ingredients").insert(rows);
      if (ingredientError) throw new Error(ingredientError.message);
    }
  }
}

export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw new Error(error.message);
}

export async function getMealPlan(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_plan_entries")
    .select("id, family_id, recipe_id, date, meal_type, notes, recipes(id, title)")
    .eq("family_id", familyId)
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertMealPlanEntry(input: unknown) {
  const parsed = mealEntrySchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("meal_plan_entries")
    .upsert(
      {
        family_id: parsed.familyId,
        recipe_id: parsed.recipeId ?? null,
        date: parsed.date,
        meal_type: parsed.mealType,
        notes: parsed.notes ?? null,
        created_by: user.id
      },
      { onConflict: "family_id,date,meal_type" }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteMealPlanEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_plan_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
}

export async function addRecipeIngredientsToList(recipeId: string, listId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: ingredients, error } = await supabase
    .from("recipe_ingredients")
    .select("name, quantity, unit")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  if (!ingredients || ingredients.length === 0) return 0;

  const { count } = await supabase.from("list_items").select("id", { count: "exact", head: true }).eq("list_id", listId);
  let startIndex = count ?? 0;

  const rows = ingredients.map((ingredient, index) => ({
    list_id: listId,
    text: ingredient.name,
    quantity: [ingredient.quantity, ingredient.unit].filter(Boolean).join(" ") || null,
    category: "Meal plan",
    created_by: user.id,
    sort_order: startIndex + index
  }));

  const { error: insertError } = await supabase.from("list_items").insert(rows);
  if (insertError) throw new Error(insertError.message);

  return rows.length;
}
