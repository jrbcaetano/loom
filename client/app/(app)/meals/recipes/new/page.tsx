import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { RecipeForm } from "@/features/meals/recipe-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NewRecipePage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("recipes.createTitle", "Create recipe")}</h2>
          <p className="loom-module-subtitle">{t("recipes.createSubtitle", "Build recipes with ingredients ready for shopping list export.")}</p>
        </div>
      </section>
      <section className="loom-card p-5">
        <RecipeForm familyId={context.activeFamilyId} endpoint="/api/meals/recipes" method="POST" redirectTo="/meals/recipes" submitLabel={t("recipes.createTitle", "Create recipe")} />
      </section>
    </div>
  );
}