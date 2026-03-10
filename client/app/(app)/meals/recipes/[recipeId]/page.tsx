import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getListsForFamily } from "@/features/lists/server";
import { AddIngredientsForm } from "@/features/meals/add-ingredients-form";
import { getRecipeById } from "@/features/meals/server";
import { RecipeForm } from "@/features/meals/recipe-form";
import { DeleteButton } from "@/components/common/delete-button";
import { getServerI18n } from "@/lib/i18n/server";
import { getDisplayListTitle } from "@/features/lists/display";

type RecipeDetailPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function RecipeDetailPage({ params, searchParams }: RecipeDetailPageProps) {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  const { recipeId } = await params;
  const query = await searchParams;

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const recipe = await getRecipeById(recipeId);
  if (!recipe) {
    notFound();
  }

  const lists = await getListsForFamily(context.activeFamilyId);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{recipe.title}</h2>
          <p className="loom-module-subtitle">{recipe.description ?? t("common.noDescription", "No description")}</p>
        </div>
        <Link href={`/meals/recipes/${recipe.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
          {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("recipes.edit", "Edit recipe")}
        </Link>
      </section>

      <section className="loom-card p-5">
        <h3 className="loom-section-title">{t("recipes.ingredients", "Ingredients")}</h3>
        <div className="loom-info-grid mt-4">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("recipes.ingredients", "Ingredients")}</p>
            <p className="loom-info-value">{(recipe.ingredients ?? []).length}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("recipes.familyLists", "Family lists")}</p>
            <p className="loom-info-value">{lists.length}</p>
          </article>
        </div>

        <div className="mt-4 loom-stack-sm">
          {(recipe.ingredients ?? []).map((ingredient) => (
            <p key={ingredient.id} className="loom-soft-row m-0">
              {ingredient.name}
              {[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ") ? ` - ${[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}` : ""}
            </p>
          ))}
        </div>
      </section>

      {lists.length > 0 ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("recipes.generateShoppingItems", "Generate shopping items")}</h3>
          <div className="mt-3">
            <AddIngredientsForm
              recipeId={recipe.id}
              lists={lists.map((list) => ({ id: list.id, title: getDisplayListTitle(list.title, list.isSystemShoppingList, t) }))}
            />
          </div>
        </section>
      ) : null}

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("recipes.edit", "Edit recipe")}</h3>
          <div className="mt-4">
            <RecipeForm
              familyId={recipe.family_id}
              endpoint={`/api/meals/recipes/${recipe.id}`}
              method="PATCH"
              redirectTo={`/meals/recipes/${recipe.id}`}
              submitLabel={t("recipes.save", "Save recipe")}
              initialValues={{
                title: recipe.title,
                description: recipe.description ?? "",
                instructions: recipe.instructions ?? "",
                ingredients: (recipe.ingredients ?? []).map((item) => ({
                  name: item.name,
                  quantity: item.quantity ?? "",
                  unit: item.unit ?? ""
                }))
              }}
            />
          </div>
          <div className="mt-4">
            <DeleteButton endpoint={`/api/meals/recipes/${recipe.id}`} redirectTo="/meals/recipes" label={t("recipes.delete", "Delete recipe")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
