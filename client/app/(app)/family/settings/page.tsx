import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyExternalCalendars, getFamilySettings } from "@/features/families/server";
import { FamilySettingsForm } from "@/features/families/family-settings-form";
import { ShoppingListCsvManager } from "@/features/families/shopping-list-csv-manager";
import { getServerI18n } from "@/lib/i18n/server";
import { TaskLabelsManager } from "@/features/tasks/task-labels-manager";
import { getScheduleTemplates } from "@/features/schedules/server";
import { ScheduleTemplatesManager } from "@/features/schedules/schedule-templates-manager";
import { SettingsPanel, SettingsPanelSection } from "@/components/patterns/settings-panel";

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

  const [externalCalendars, familySettings, scheduleTemplates] = await Promise.all([
    getFamilyExternalCalendars(activeFamily.id),
    getFamilySettings(activeFamily.id),
    getScheduleTemplates(activeFamily.id)
  ]);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("family.settingsTitle", "Family Settings")}</h2>
          <p className="loom-module-subtitle">{t("family.settingsSubtitle", "Admins can update family details and defaults.")}</p>
        </div>
      </section>
      <SettingsPanel
        title={t("family.settingsTitle", "Family Settings")}
        description={t("family.settingsSubtitle", "Admins can update family details, defaults, imports, and shared planning tools.")}
      >
        <SettingsPanelSection
          title={t("family.settingsOverview", "Overview")}
          description={t("family.settingsOverviewHint", "Change the active family name, list behavior, and shared calendar feeds.")}
        >
          <FamilySettingsForm
            familyId={activeFamily.id}
            defaultName={activeFamily.name}
            defaultAllowMultipleLists={familySettings.allowMultipleLists}
            defaultExternalCalendars={externalCalendars}
          />
        </SettingsPanelSection>

        <SettingsPanelSection
          title={t("family.shoppingListCsvSettingsTitle", "Shopping list import and export")}
          description={t(
            "family.shoppingListCsvSettingsHint",
            "Manage the family Shopping List with CSV files instead of receipt imports."
          )}
        >
          <ShoppingListCsvManager familyId={activeFamily.id} />
        </SettingsPanelSection>

        <SettingsPanelSection
          title={t("family.taskLabelsTitle", "Family task labels")}
          description={t("family.taskLabelsHint", "These labels are shared with the whole family for planning and filtering tasks.")}
        >
          <TaskLabelsManager scope="family" familyId={activeFamily.id} />
        </SettingsPanelSection>

        <SettingsPanelSection
          title={t("family.scheduleTemplatesTitle", "Schedule templates")}
          description={t("family.scheduleTemplatesHint", "Create shared shift and timetable templates that can be reused by any family member when planning schedules.")}
        >
          <ScheduleTemplatesManager familyId={activeFamily.id} initialTemplates={scheduleTemplates} />
        </SettingsPanelSection>
      </SettingsPanel>
    </div>
  );
}
