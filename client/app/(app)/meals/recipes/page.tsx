import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getListsForFamily } from "@/features/lists/server";
import { getDisplayListTitle } from "@/features/lists/display";
import { MealRecipesClient } from "@/features/meals/meal-recipes-client";
import { getRecipes } from "@/features/meals/server";
import { getServerI18n } from "@/lib/i18n/server";

export default async function RecipesPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const [recipes, lists] = await Promise.all([
    getRecipes(context.activeFamilyId),
    getListsForFamily(context.activeFamilyId)
  ]);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("recipes.title", "Recipes")}</h2>
          <p className="loom-module-subtitle">{t("recipes.subtitle", "Shared recipe collection for your family.")}</p>
        </div>
      </section>
      <MealRecipesClient
        familyId={context.activeFamilyId}
        initialRecipes={recipes}
        lists={lists.map((list) => ({ id: list.id, title: getDisplayListTitle(list.title, list.isSystemShoppingList, t) }))}
      />
    </div>
  );
}
