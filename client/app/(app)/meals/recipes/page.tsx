import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getRecipes } from "@/features/meals/server";

export default async function RecipesPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const recipes = await getRecipes(context.activeFamilyId);

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Shared recipe collection for your family.</p>
        <Link href="/meals/recipes/new" className="loom-button-primary">
          New recipe
        </Link>
      </div>

      <div className="loom-stack-sm">
        {recipes.map((recipe) => (
          <article key={recipe.id} className="loom-card p-4">
            <Link href={`/meals/recipes/${recipe.id}`} className="loom-link-strong">
              {recipe.title}
            </Link>
            <p className="loom-muted small mt-2">{recipe.description ?? "No description"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
