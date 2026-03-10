import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { CreateFamilyForm } from "@/features/families/create-family-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function CreateFamilyPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (context.families.length > 0) {
    return null;
  }

  return (
    <main className="loom-auth-shell">
      <section className="loom-auth-wrap">
        <div className="loom-auth-progress">
          <span className="is-active" />
          <span />
          <span />
        </div>
        <p className="loom-muted small m-0">{t("onboarding.createFamilyStep", "Step 1 of 3")}</p>
        <h1 className="loom-auth-title">{t("onboarding.createFamilyTitle", "Create Your Family")}</h1>
        <p className="loom-auth-subtitle">{t("onboarding.createFamilySubtitle", "Give your family a name to get started.")}</p>
        <section className="loom-auth-card">
          <CreateFamilyForm />
        </section>
      </section>
    </main>
  );
}
