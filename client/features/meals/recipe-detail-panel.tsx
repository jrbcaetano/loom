"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import type { EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { RecipeForm } from "@/features/meals/recipe-form";
import { AddIngredientsForm } from "@/features/meals/add-ingredients-form";
import { useI18n } from "@/lib/i18n/context";

type RecipeDetail = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  created_at: string;
  ingredients?: Array<{ id: string; name: string; quantity: string | null; unit: string | null }>;
};

type ListOption = { id: string; title: string };

async function fetchRecipe(recipeId: string) {
  const response = await fetch(`/api/meals/recipes/${recipeId}`, { cache: "no-store" });
  const payload = (await response.json()) as { recipe?: RecipeDetail | null; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load recipe");
  }
  return payload.recipe ?? null;
}

export function RecipeDetailPanel({
  itemId,
  routeState,
  close,
  updateRouteState,
  lists
}: EntityDetailRegistryEntryProps & { lists: ListOption[] }) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const isEditing = routeState.panel === "edit";
  const recipeQuery = useQuery({
    queryKey: ["recipe-detail", itemId],
    queryFn: () => fetchRecipe(itemId)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meals/recipes/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete recipe");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      close();
    }
  });

  const recipe = recipeQuery.data;
  const ingredientCount = recipe?.ingredients?.length ?? 0;

  return (
    <EntityDetailShell
      isOpen
      title={recipe?.title ?? t("recipes.detailTitle", "Recipe")}
      eyebrow={t("recipes.title", "Recipes")}
      subtitle={recipe?.description ?? undefined}
      summaryMeta={
        recipe ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("recipes.ingredients", "Ingredients")} value={ingredientCount} />
            <EntitySummaryMetaItem label={t("common.created", "Created")} value={new Date(recipe.created_at).toLocaleDateString(dateLocale)} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
      headerActions={
        recipe ? (
          <div className="loom-inline-actions">
            <button type="button" className="loom-button-ghost" onClick={() => updateRouteState({ panel: isEditing ? null : "edit" })}>
              {isEditing ? t("common.cancel", "Cancel") : t("recipes.edit", "Edit recipe")}
            </button>
            <button type="button" className="loom-task-icon-button" aria-label={t("common.close", "Close")} onClick={close}>
              ??
            </button>
          </div>
        ) : undefined
      }
    >
      {recipeQuery.isPending ? <EntityDrawerLoadingState message={t("recipes.loading", "Loading recipes...")} /> : null}
      {recipeQuery.error ? <EntityDrawerErrorState message={recipeQuery.error.message} /> : null}
      {!recipeQuery.isPending && !recipeQuery.error && !recipe ? <EntityDrawerEmptyState message={t("recipes.none", "No recipes yet.")} /> : null}

      {recipe ? (
        <>
          <EntitySection title={t("common.details", "Details")}>
            <EntityMetadataGrid>
              <EntityMetadataItem label={t("recipes.ingredients", "Ingredients")} value={ingredientCount} />
              <EntityMetadataItem label={t("recipes.familyLists", "Family lists")} value={lists.length} />
              <EntityMetadataItem label={t("common.created", "Created")} value={new Date(recipe.created_at).toLocaleString(dateLocale)} />
            </EntityMetadataGrid>
          </EntitySection>

          <EntitySection title={t("recipes.ingredients", "Ingredients")}>
            <div className="loom-stack-sm">
              {(recipe.ingredients ?? []).map((ingredient) => (
                <p key={ingredient.id} className="loom-soft-row m-0">
                  {ingredient.name}
                  {[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ") ? ` - ${[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}` : ""}
                </p>
              ))}
              {(recipe.ingredients ?? []).length === 0 ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}
            </div>
          </EntitySection>

          {recipe.instructions ? (
            <EntitySection title={t("recipes.instructions", "Instructions")}>
              <p className="m-0 whitespace-pre-wrap">{recipe.instructions}</p>
            </EntitySection>
          ) : null}

          {lists.length > 0 ? (
            <EntitySection title={t("recipes.generateShoppingItems", "Generate shopping items")}>
              <AddIngredientsForm recipeId={recipe.id} lists={lists} />
            </EntitySection>
          ) : null}

          {isEditing ? (
            <EntitySection title={t("recipes.edit", "Edit recipe")}>
              <RecipeForm
                familyId={recipe.family_id}
                endpoint={`/api/meals/recipes/${recipe.id}`}
                method="PATCH"
                redirectTo="/meals/recipes"
                disableRedirect
                submitLabel={t("recipes.save", "Save recipe")}
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["recipes"] });
                  queryClient.invalidateQueries({ queryKey: ["recipe-detail", recipe.id] });
                  updateRouteState({ panel: null });
                }}
                initialValues={{
                  title: recipe.title,
                  description: recipe.description ?? "",
                  instructions: recipe.instructions ?? "",
                  ingredients: (recipe.ingredients ?? []).map((ingredient) => ({
                    name: ingredient.name,
                    quantity: ingredient.quantity ?? "",
                    unit: ingredient.unit ?? ""
                  }))
                }}
              />
              <div className="mt-4">
                <button
                  type="button"
                  className="loom-button-ghost loom-signout-danger"
                  onClick={() => {
                    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) return;
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("recipes.delete", "Delete recipe")}
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
