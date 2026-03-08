"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
      if (!response.ok) throw new Error(payload.error ?? "Failed to save meal plan entry");
    },
    onSuccess: () => {
      setErrorText(null);
      queryClient.invalidateQueries({ queryKey: ["meal-plan", familyId] });
    },
    onError: (mutationError) => {
      setErrorText(mutationError instanceof Error ? mutationError.message : "Failed to save meal plan entry");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await fetch(`/api/meals/planner/${entryId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete meal plan entry");
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
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h2 className="loom-section-title">Plan meal</h2>
          <Link href="/meals/recipes" className="loom-subtle-link">
            Browse recipes
          </Link>
        </div>
        <form className="loom-form-stack mt-3" onSubmit={onSubmit}>
          <div className="loom-form-inline">
            <label className="loom-field">
              <span>Date</span>
              <input className="loom-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="loom-field">
              <span>Meal type</span>
              <select className="loom-input" value={mealType} onChange={(event) => setMealType(event.target.value as "breakfast" | "lunch" | "dinner")}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </label>
          </div>
          <label className="loom-field">
            <span>Recipe</span>
            <select className="loom-input" value={recipeId} onChange={(event) => setRecipeId(event.target.value)}>
              <option value="">No recipe</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.title}
                </option>
              ))}
            </select>
          </label>
          <label className="loom-field">
            <span>Notes</span>
            <input className="loom-input" type="text" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button className="loom-button-primary" type="submit" disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? "Saving..." : "Save plan entry"}
          </button>
          {errorText ? <p className="loom-feedback-error">{errorText}</p> : null}
        </form>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Planned meals</h2>
        {isPending ? <p className="loom-muted mt-3">Loading planner...</p> : null}
        {error ? <p className="loom-feedback-error mt-3">{error.message}</p> : null}
        <div className="loom-stack-sm mt-3">
          {grouped.map(([groupDate, entries]) => (
            <article key={groupDate} className="loom-card soft p-4">
              <p className="m-0 font-semibold">{new Date(`${groupDate}T00:00:00`).toDateString()}</p>
              <div className="loom-stack-sm mt-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="loom-row-between">
                    <p className="m-0">
                      <strong className="capitalize">{entry.meal_type}</strong>: {entry.recipes?.title ?? "No recipe"} {entry.notes ? `- ${entry.notes}` : ""}
                    </p>
                    <button className="loom-button-ghost" type="button" onClick={() => deleteMutation.mutate(entry.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
