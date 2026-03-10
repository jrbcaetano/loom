import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getRecipes } from "@/features/meals/server";
import { getServerI18n } from "@/lib/i18n/server";

export default async function RecipesPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const recipes = await getRecipes(context.activeFamilyId);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("recipes.title", "Recipes")}</h2>
          <p className="loom-module-subtitle">{t("recipes.subtitle", "Shared recipe collection for your family.")}</p>
        </div>
        <Link href="/meals/recipes/new" className="loom-button-primary">
          {t("recipes.new", "New recipe")}
        </Link>
      </section>

      <div className="loom-card p-3">
        <div className="loom-stack-sm">
          {recipes.map((recipe) => (
            <article key={recipe.id} className="loom-conversation-row">
              <div>
                <Link href={`/meals/recipes/${recipe.id}`} className="loom-link-strong">
                  {recipe.title}
                </Link>
                <p className="loom-entity-meta">{recipe.description ?? t("common.noDescription", "No description")}</p>
              </div>
              <span className="loom-badge">{t("recipes.badge", "Recipe")}</span>
            </article>
          ))}
          {recipes.length === 0 ? <p className="loom-muted p-2">{t("recipes.none", "No recipes yet.")}</p> : null}
        </div>
      </div>
    </div>
  );
}