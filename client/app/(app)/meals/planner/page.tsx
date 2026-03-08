import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getRecipes } from "@/features/meals/server";
import { MealPlannerClient } from "@/features/meals/meal-planner-client";

export default async function MealPlannerPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const recipes = await getRecipes(context.activeFamilyId);

  return (
    <MealPlannerClient
      familyId={context.activeFamilyId}
      recipes={recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title
      }))}
    />
  );
}
