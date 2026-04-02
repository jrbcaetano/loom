"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CollectionControls, CollectionControlAction, CollectionControlField } from "@/components/patterns/collection-controls";
import { CreateEntityModal } from "@/components/patterns/create-entity-modal";
import { RouteStateEntityDetailRegistry, type EntityDetailRegistryEntry } from "@/features/entities/entity-detail-registry";
import { RecipeDetailPanel } from "@/features/meals/recipe-detail-panel";
import { RecipeForm } from "@/features/meals/recipe-form";
import { useI18n } from "@/lib/i18n/context";
import { useCollectionRouteState } from "@/lib/routing/use-collection-route-state";

type RecipeRow = {
  id: string;
  title: string;
  description: string | null;
  created_at?: string;
};

type ListOption = { id: string; title: string };

async function fetchRecipes(familyId: string) {
  const response = await fetch(`/api/meals/recipes?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { recipes?: RecipeRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load recipes");
  return payload.recipes ?? [];
}

export function MealRecipesClient({
  familyId,
  initialRecipes,
  lists
}: {
  familyId: string;
  initialRecipes: RecipeRow[];
  lists: ListOption[];
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { routeState, updateRouteState, openItem, clearItem, clearCreate, openCreate } = useCollectionRouteState();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "az">("newest");

  const query = useQuery({
    queryKey: ["recipes", familyId],
    queryFn: () => fetchRecipes(familyId),
    initialData: initialRecipes
  });

  const filteredRecipes = useMemo(() => {
    const items = [...(query.data ?? [])].filter((recipe) => {
      if (search.trim().length === 0) return true;
      return `${recipe.title} ${recipe.description ?? ""}`.toLowerCase().includes(search.trim().toLowerCase());
    });

    items.sort((left, right) => {
      if (sortOrder === "az") {
        return left.title.localeCompare(right.title);
      }
      return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
    });

    return items;
  }, [query.data, search, sortOrder]);

  const detailRegistry: EntityDetailRegistryEntry[] = [
    {
      key: "recipe",
      Component: (props) => <RecipeDetailPanel {...props} lists={lists} />
    }
  ];

  return (
    <div className="loom-stack">
      <CollectionControls>
          <CollectionControlField>
            <span>{t("common.search", "Search")}</span>
            <input className="loom-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("recipes.searchPlaceholder", "Search recipes")} />
          </CollectionControlField>
          <CollectionControlField>
            <span>{t("common.sort", "Sort")}</span>
            <select className="loom-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
              <option value="newest">{t("common.newest", "Newest")}</option>
              <option value="az">{t("common.alphabetical", "Alphabetical")}</option>
            </select>
          </CollectionControlField>
          <CollectionControlAction>
            <button type="button" className="loom-button-primary" onClick={() => openCreate("recipe")}>{t("recipes.new", "New recipe")}</button>
          </CollectionControlAction>
      </CollectionControls>

      <div className="loom-card p-3">
        <div className="loom-stack-sm">
          {filteredRecipes.map((recipe) => (
            <article key={recipe.id} className="loom-conversation-row">
              <div>
                <button type="button" className="loom-link-button loom-link-strong" aria-label={`${t("recipes.openRecipe", "Open recipe")}: ${recipe.title}`} onClick={() => openItem(recipe.id)}>
                  {recipe.title}
                </button>
                <p className="loom-entity-meta">{recipe.description ?? t("common.noDescription", "No description")}</p>
              </div>
              <span className="loom-badge">{t("recipes.badge", "Recipe")}</span>
            </article>
          ))}
          {filteredRecipes.length === 0 ? <p className="loom-muted p-2">{t("recipes.none", "No recipes yet.")}</p> : null}
        </div>
      </div>

      <CreateEntityModal
        isOpen={routeState.create === "recipe"}
        title={t("recipes.createTitle", "Create recipe")}
        eyebrow={t("recipes.title", "Recipes")}
        subtitle={t("recipes.createSubtitle", "Build recipes with ingredients ready for shopping list export.")}
        onClose={() => clearCreate()}
      >
        <RecipeForm
          familyId={familyId}
          endpoint="/api/meals/recipes"
          method="POST"
          redirectTo="/meals/recipes"
          submitLabel={t("recipes.createTitle", "Create recipe")}
          disableRedirect
          onSaved={({ recipeId }) => {
            queryClient.invalidateQueries({ queryKey: ["recipes"] });
            clearCreate();
            if (recipeId) openItem(recipeId);
          }}
        />
      </CreateEntityModal>

      <RouteStateEntityDetailRegistry routeState={routeState} entries={detailRegistry} close={() => clearItem()} updateRouteState={updateRouteState} />
    </div>
  );
}
