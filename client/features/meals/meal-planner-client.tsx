"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CollectionControls, CollectionControlAction, CollectionControlField } from "@/components/patterns/collection-controls";
import { CreateEntityModal } from "@/components/patterns/create-entity-modal";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import { SettingsPanel, SettingsPanelSection } from "@/components/patterns/settings-panel";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry, type EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

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

type MealEntryFormValues = {
  date: string;
  mealType: "breakfast" | "lunch" | "dinner";
  recipeId: string;
  notes: string;
};

async function fetchMealPlan(familyId: string) {
  const response = await fetch(`/api/meals/planner?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { entries?: MealEntry[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load meal plan");
  return payload.entries ?? [];
}

function MealEntryForm({
  familyId,
  recipes,
  submitLabel,
  initialValues,
  onSaved,
  existingEntryId
}: {
  familyId: string;
  recipes: Recipe[];
  submitLabel: string;
  initialValues?: Partial<MealEntryFormValues>;
  onSaved: (entryId?: string) => void;
  existingEntryId?: string;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState(initialValues?.date ?? new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner">(initialValues?.mealType ?? "dinner");
  const [recipeId, setRecipeId] = useState(initialValues?.recipeId ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [errorText, setErrorText] = useState<string | null>(null);

  const saveMutation = useMutation({
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
      const payload = (await response.json()) as { entryId?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? t("meals.saveEntryError", "Failed to save meal plan entry"));
      return payload.entryId;
    },
    onSuccess: async (entryId) => {
      if (existingEntryId && existingEntryId !== entryId && (initialValues?.date !== date || initialValues?.mealType !== mealType)) {
        await fetch(`/api/meals/planner/${existingEntryId}`, { method: "DELETE" });
      }
      onSaved(entryId);
    },
    onError: (error) => {
      setErrorText(error instanceof Error ? error.message : t("meals.saveEntryError", "Failed to save meal plan entry"));
    }
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText(null);
    saveMutation.mutate();
  }

  return (
    <form className="loom-form-stack" onSubmit={onSubmit}>
      <div className="loom-filter-row">
        <label className="loom-field">
          <span>{t("common.date", "Date")}</span>
          <input className="loom-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="loom-field">
          <span>{t("meals.mealType", "Meal type")}</span>
          <select className="loom-input" value={mealType} onChange={(event) => setMealType(event.target.value as typeof mealType)}>
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

      <button className="loom-button-primary" type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? t("common.saving", "Saving...") : submitLabel}
      </button>
      {errorText ? <p className="loom-feedback-error">{errorText}</p> : null}
    </form>
  );
}

function MealEntryDetailPanel({
  itemId,
  routeState,
  close,
  updateRouteState,
  familyId,
  recipes
}: EntityDetailRegistryEntryProps & { familyId: string; recipes: Recipe[] }) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const isEditing = routeState.panel === "edit";
  const query = useQuery({
    queryKey: ["meal-plan", familyId],
    queryFn: () => fetchMealPlan(familyId)
  });

  const entry = query.data?.find((item) => item.id === itemId) ?? null;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meals/planner/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? t("meals.deleteEntryError", "Failed to delete meal plan entry"));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["meal-plan", familyId] });
      close();
    }
  });

  return (
    <EntityDetailShell
      isOpen
      title={entry?.recipes?.title ?? t("meals.entryTitle", "Meal entry")}
      eyebrow={t("nav.meals", "Meal Planner")}
      subtitle={entry ? `${t(`meals.${entry.meal_type}`, entry.meal_type)} · ${new Date(`${entry.date}T00:00:00`).toLocaleDateString(dateLocale)}` : undefined}
      summaryMeta={
        entry ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("meals.mealType", "Meal type")} value={t(`meals.${entry.meal_type}`, entry.meal_type)} />
            <EntitySummaryMetaItem label={t("common.date", "Date")} value={new Date(`${entry.date}T00:00:00`).toLocaleDateString(dateLocale)} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
      headerActions={
        entry ? (
          <div className="loom-inline-actions">
            <button type="button" className="loom-button-ghost" onClick={() => updateRouteState({ panel: isEditing ? null : "edit" })}>
              {isEditing ? t("common.cancel", "Cancel") : t("common.edit", "Edit")}
            </button>
          </div>
        ) : undefined
      }
    >
      {query.isPending ? <EntityDrawerLoadingState message={t("meals.loadingPlanner", "Loading planner...")} /> : null}
      {query.error ? <EntityDrawerErrorState message={query.error.message} /> : null}
      {!query.isPending && !query.error && !entry ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}
      {entry ? (
        <>
          <EntitySection title={t("common.details", "Details")}>
            <EntityMetadataGrid>
              <EntityMetadataItem label={t("meals.mealType", "Meal type")} value={t(`meals.${entry.meal_type}`, entry.meal_type)} />
              <EntityMetadataItem label={t("common.date", "Date")} value={new Date(`${entry.date}T00:00:00`).toLocaleDateString(dateLocale)} />
              <EntityMetadataItem label={t("recipes.title", "Recipe")} value={entry.recipes?.title ?? t("meals.noRecipe", "No recipe")} />
            </EntityMetadataGrid>
          </EntitySection>
          <EntitySection title={t("notes.label", "Notes")}>
            <p className="m-0">{entry.notes ?? t("common.noDescription", "No description")}</p>
          </EntitySection>
          {isEditing ? (
            <EntitySection title={t("common.edit", "Edit")}>
              <MealEntryForm
                familyId={familyId}
                recipes={recipes}
                existingEntryId={entry.id}
                initialValues={{
                  date: entry.date,
                  mealType: entry.meal_type,
                  recipeId: entry.recipe_id ?? "",
                  notes: entry.notes ?? ""
                }}
                submitLabel={t("common.saveChanges", "Save changes")}
                onSaved={(savedId) => {
                  queryClient.invalidateQueries({ queryKey: ["meal-plan", familyId] });
                  updateRouteState({ panel: null, item: savedId ?? entry.id });
                }}
              />
              <div className="mt-4">
                <button type="button" className="loom-button-ghost loom-signout-danger" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
                </button>
                {deleteMutation.error ? <p className="loom-feedback-error mt-2">{deleteMutation.error.message}</p> : null}
              </div>
            </EntitySection>
          ) : null}
        </>
      ) : null}
    </EntityDetailShell>
  );
}

export function MealPlannerClient({ familyId, recipes }: { familyId: string; recipes: Recipe[] }) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const { routeState, updateRouteState, openItem, clearItem, openCreate, clearCreate } = useCollectionRouteState();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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
    const sorted = Array.from(map.entries()).sort(([a], [b]) => (sortOrder === "asc" ? (a < b ? -1 : 1) : a < b ? 1 : -1));
    return sorted;
  }, [data, sortOrder]);

  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "meal-entry",
      Component: (props) => <MealEntryDetailPanel {...props} familyId={familyId} recipes={recipes} />
    }
  ];

  return (
    <div className="loom-grid-3">
      <section className="loom-stack loom-span-2-desktop">
        <CollectionControls>
            <CollectionControlField>
              <span>{t("common.sort", "Sort")}</span>
              <select className="loom-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
                <option value="asc">{t("common.oldest", "Oldest")}</option>
                <option value="desc">{t("common.newest", "Newest")}</option>
              </select>
            </CollectionControlField>
            <CollectionControlAction>
              <button type="button" className="loom-button-primary" onClick={() => openCreate("meal-entry")}>{t("meals.addMeal", "Add meal")}</button>
            </CollectionControlAction>
        </CollectionControls>

        <article className="loom-stack-sm">
          {isPending ? <p className="loom-muted">{t("meals.loadingPlanner", "Loading planner...")}</p> : null}
          {error ? <p className="loom-feedback-error">{error.message}</p> : null}

          {grouped.map(([groupDate, entries]) => (
            <section key={groupDate} className="loom-card p-5">
              <div className="loom-row-between">
                <div>
                  <p className="m-0 font-semibold">{new Date(`${groupDate}T00:00:00`).toLocaleDateString(dateLocale, { weekday: "long", month: "short", day: "numeric" })}</p>
                  <p className="loom-muted small m-0">{entries.length} {t("meals.meals", "meals")}</p>
                </div>
              </div>
              <div className="loom-stack-sm mt-3">
                {entries.map((entry) => (
                  <button key={entry.id} type="button" className="loom-soft-row loom-link-button" aria-label={`${t("meals.openMeal", "Open meal")}: ${entry.recipes?.title ?? t("meals.noRecipe", "No recipe")}`} onClick={() => openItem(entry.id)}>
                    <div className="loom-row-between">
                      <p className="m-0"><strong className="capitalize">{entry.meal_type}</strong> - {entry.recipes?.title ?? t("meals.noRecipe", "No recipe")}</p>
                      <span className="loom-muted small">{entry.notes ? t("common.view", "View") : t("common.open", "Open")}</span>
                    </div>
                    {entry.notes ? <p className="loom-muted small mt-1 m-0">{entry.notes}</p> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {grouped.length === 0 && !isPending ? <p className="loom-muted">{t("common.none", "None")}</p> : null}
        </article>
      </section>

      <aside className="loom-stack">
        <SettingsPanel
          title={t("meals.workspaceTools", "Meal planning tools")}
          description={t("meals.workspaceToolsHint", "Keep recipe references and common meal actions nearby while planning the week.")}
        >
          <SettingsPanelSection title={t("meals.recipeIdeas", "Recipe ideas")}>
            <div className="loom-stack-sm">
              {recipes.slice(0, 4).map((recipe) => (
                <Link key={recipe.id} href={`/meals/recipes?item=${recipe.id}`} className="loom-soft-row">
                  {recipe.title}
                </Link>
              ))}
              {recipes.length === 0 ? <p className="loom-muted">{t("recipes.none", "No recipes yet.")}</p> : null}
            </div>
          </SettingsPanelSection>

          <SettingsPanelSection title={t("home.quickActions", "Quick actions")}>
            <div className="loom-stack-sm">
              <Link href="/meals/recipes?create=recipe" className="loom-button-ghost">{t("recipes.createTitle", "Create recipe")}</Link>
              <Link href="/lists" className="loom-button-ghost">{t("meals.openShoppingLists", "Open shopping lists")}</Link>
              <Link href="/meals/recipes" className="loom-button-ghost">{t("meals.manageRecipes", "Manage recipes")}</Link>
            </div>
          </SettingsPanelSection>
        </SettingsPanel>
      </aside>

      <CreateEntityModal
        isOpen={routeState.create === "meal-entry"}
        title={t("meals.addMeal", "Add meal")}
        eyebrow={t("nav.meals", "Meal Planner")}
        subtitle={t("meals.weeklySubtitle", "Build your meal plan and manage day-by-day meals.")}
        onClose={() => clearCreate()}
      >
        <MealEntryForm
          familyId={familyId}
          recipes={recipes}
          submitLabel={t("meals.addMeal", "Add meal")}
          onSaved={(entryId) => {
            queryClient.invalidateQueries({ queryKey: ["meal-plan", familyId] });
            clearCreate();
            if (entryId) openItem(entryId);
          }}
        />
      </CreateEntityModal>

      <RouteStateEntityDetailRegistry routeState={routeState} entries={detailRegistry} close={() => clearItem()} updateRouteState={updateRouteState} />
    </div>
  );
}
