"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

type Recipe = { id: string; title: string };
type MealEntry = {
  id: string;
  family_id: string;
  recipe_id: string | null;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  notes: string | null;
  recipes?: { id: string; title: string } | null;
};

async function fetchMealPlan(familyId: string) {
  const response = await fetch(`/api/meals/planner?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { entries?: MealEntry[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load meal plan");
  return payload.entries ?? [];
}

export function MealPlannerClient({ familyId, recipes }: { familyId: string; recipes: Recipe[] }) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner">("dinner");
  const [recipeId, setRecipeId] = useState("");
  const [notes, setNotes] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["meal-plan", familyId],
    queryFn: () => fetchMealPlan(familyId)
  });

  const grouped = useMemo(() => {
    const map = new Map<string, MealEntry[]>();
    for (const entry of data ?? []) {
      const key = entry.date;
      const current = map.get(key) ?? [];
      current.push(entry);
      map.set(key, current);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [data]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/meals/planner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          familyId,
          date,
          mealType,
          recipeId: recipeId || null,
          notes: notes || null
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t("meals.saveEntryError", "Failed to save meal plan entry"));
    },
    onSuccess: () => {
      setErrorText(null);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["meal-plan", familyId] });
    },
    onError: (mutationError) => {
      setErrorText(mutationError instanceof Error ? mutationError.message : t("meals.saveEntryError", "Failed to save meal plan entry"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await fetch(`/api/meals/planner/${entryId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t("meals.deleteEntryError", "Failed to delete meal plan entry"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan", familyId] });
    }
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    upsertMutation.mutate();
  }

  return (
    <div className="loom-grid-3">
      <section className="loom-stack loom-span-2-desktop">
        <article className="loom-card p-5">
          <h3 className="loom-section-title">{t("meals.addMeal", "Add meal")}</h3>
          <form className="loom-form-stack mt-3" onSubmit={onSubmit}>
            <div className="loom-filter-row">
              <label className="loom-field">
                <span>{t("common.date", "Date")}</span>
                <input className="loom-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <label className="loom-field">
                <span>{t("meals.mealType", "Meal type")}</span>
                <select className="loom-input" value={mealType} onChange={(event) => setMealType(event.target.value as "breakfast" | "lunch" | "dinner")}>
                  <option value="breakfast">{t("meals.breakfast", "Breakfast")}</option>
                  <option value="lunch">{t("meals.lunch", "Lunch")}</option>
                  <option value="dinner">{t("meals.dinner", "Dinner")}</option>
                </select>
              </label>
            </div>

            <label className="loom-field">
              <span>{t("recipes.title", "Recipe")}</span>
              <select className="loom-input" value={recipeId} onChange={(event) => setRecipeId(event.target.value)}>
                <option value="">{t("meals.noRecipe", "No recipe")}</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="loom-field">
              <span>{t("notes.label", "Notes")}</span>
              <input className="loom-input" type="text" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>

            <button className="loom-button-primary" type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? t("common.saving", "Saving...") : t("meals.addMeal", "Add meal")}
            </button>
            {errorText ? <p className="loom-feedback-error">{errorText}</p> : null}
          </form>
        </article>

        <article className="loom-stack-sm">
          {isPending ? <p className="loom-muted">{t("meals.loadingPlanner", "Loading planner...")}</p> : null}
          {error ? <p className="loom-feedback-error">{error.message}</p> : null}

          {grouped.map(([groupDate, entries]) => (
            <section key={groupDate} className="loom-card p-5">
              <div className="loom-row-between">
                <div>
                  <p className="m-0 font-semibold">{new Date(`${groupDate}T00:00:00`).toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
                  <p className="loom-muted small m-0">{entries.length} {t("meals.meals", "meals")}</p>
                </div>
              </div>
              <div className="loom-stack-sm mt-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="loom-soft-row">
                    <div className="loom-row-between">
                      <p className="m-0"><strong className="capitalize">{entry.meal_type}</strong> - {entry.recipes?.title ?? t("meals.noRecipe", "No recipe")}</p>
                      <button className="loom-plain-button" type="button" onClick={() => deleteMutation.mutate(entry.id)}>
                        {t("common.delete", "Delete")}
                      </button>
                    </div>
                    {entry.notes ? <p className="loom-muted small mt-1 m-0">{entry.notes}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </article>
      </section>

      <aside className="loom-stack">
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("meals.recipeIdeas", "Recipe ideas")}</h3>
          <div className="loom-stack-sm mt-3">
            {recipes.slice(0, 4).map((recipe) => (
              <Link key={recipe.id} href={`/meals/recipes/${recipe.id}`} className="loom-soft-row">
                {recipe.title}
              </Link>
            ))}
            {recipes.length === 0 ? <p className="loom-muted">{t("recipes.none", "No recipes yet.")}</p> : null}
          </div>
        </section>

        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("home.quickActions", "Quick actions")}</h3>
          <div className="loom-stack-sm mt-3">
            <Link href="/meals/recipes/new" className="loom-button-ghost">{t("recipes.createTitle", "Create recipe")}</Link>
            <Link href="/lists" className="loom-button-ghost">{t("meals.openShoppingLists", "Open shopping lists")}</Link>
            <Link href="/meals/recipes" className="loom-button-ghost">{t("meals.manageRecipes", "Manage recipes")}</Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
