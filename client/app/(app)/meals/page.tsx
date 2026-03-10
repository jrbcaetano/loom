import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getRecipes } from "@/features/meals/server";
import { MealPlannerClient } from "@/features/meals/meal-planner-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function MealsPage() {
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
          <h2 className="loom-module-title">{t("nav.meals", "Meal Planner")}</h2>
          <p className="loom-module-subtitle">{t("meals.subtitle", "Plan weekly meals and generate grocery needs.")}</p>
        </div>
      </section>

      <MealPlannerClient
        familyId={context.activeFamilyId}
        recipes={recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title
        }))}
      />
    </div>
  );
}