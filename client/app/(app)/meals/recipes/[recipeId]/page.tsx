import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getListsForFamily } from "@/features/lists/server";
import { AddIngredientsForm } from "@/features/meals/add-ingredients-form";
import { getRecipeById } from "@/features/meals/server";
import { RecipeForm } from "@/features/meals/recipe-form";
import { DeleteButton } from "@/components/common/delete-button";

type RecipeDetailPageProps = {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function RecipeDetailPage({ params, searchParams }: RecipeDetailPageProps) {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  const { recipeId } = await params;
  const query = await searchParams;

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const recipe = await getRecipeById(recipeId);
  if (!recipe) {
    notFound();
  }

  const lists = await getListsForFamily(context.activeFamilyId);

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{recipe.title}</h2>
            <p className="loom-muted mt-2">{recipe.description ?? "No description"}</p>
          </div>
          <Link href={`/meals/recipes/${recipe.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close edit" : "Edit"}
          </Link>
        </div>

        <div className="mt-4">
          <p className="m-0 font-semibold">Ingredients</p>
          <div className="loom-stack-sm mt-2">
            {(recipe.ingredients ?? []).map((ingredient) => (
              <p key={ingredient.id} className="m-0">
                {ingredient.name}
                {[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ") ? ` - ${[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}` : ""}
              </p>
            ))}
          </div>
        </div>
      </section>

      {lists.length > 0 ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">Generate shopping items</h3>
          <div className="mt-3">
            <AddIngredientsForm recipeId={recipe.id} lists={lists.map((list) => ({ id: list.id, title: list.title }))} />
          </div>
        </section>
      ) : null}

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">Edit recipe</h3>
          <div className="mt-4">
            <RecipeForm
              familyId={recipe.family_id}
              endpoint={`/api/meals/recipes/${recipe.id}`}
              method="PATCH"
              redirectTo={`/meals/recipes/${recipe.id}`}
              submitLabel="Save recipe"
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
            <DeleteButton endpoint={`/api/meals/recipes/${recipe.id}`} redirectTo="/meals/recipes" label="Delete recipe" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
