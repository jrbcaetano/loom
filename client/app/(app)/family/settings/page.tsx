import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyExternalCalendars } from "@/features/families/server";
import { FamilySettingsForm } from "@/features/families/family-settings-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function FamilySettingsPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const activeFamily = context.families.find((family) => family.id === context.activeFamilyId) ?? null;

  if (!activeFamily) {
    return <p className="loom-muted">{t("family.noActiveFamily", "No active family selected.")}</p>;
  }

  const externalCalendars = await getFamilyExternalCalendars(activeFamily.id);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("family.settingsTitle", "Family Settings")}</h2>
          <p className="loom-module-subtitle">{t("family.settingsSubtitle", "Admins can update family details and defaults.")}</p>
        </div>
      </section>
      <section className="loom-card p-5">
        <FamilySettingsForm familyId={activeFamily.id} defaultName={activeFamily.name} defaultExternalCalendars={externalCalendars} />
      </section>
    </div>
  );
}
