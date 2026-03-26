import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { getServerI18n } from "@/lib/i18n/server";
import { getScheduleTemplates } from "@/features/schedules/server";
import { ScheduleForm } from "@/features/schedules/schedule-form";

export default async function NewSchedulePage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const familyId = context.activeFamilyId;
  const [members, templates] = await Promise.all([
    getFamilyMembers(familyId),
    getScheduleTemplates(familyId)
  ]);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("schedules.createTitle", "Create schedule")}</h2>
          <p className="loom-module-subtitle">
            {t("schedules.createSubtitle", "Set up repeating blocks for work, school, practice, and other family rhythms.")}
          </p>
        </div>
      </section>
      <section className="loom-card p-5">
        <ScheduleForm
          familyId={familyId}
          familyMembers={members.map((member) => ({
            id: member.id,
            displayName: member.fullName ?? member.email ?? t("common.member", "Member"),
            role: member.role
          }))}
          templates={templates}
          endpoint="/api/schedules"
          method="POST"
          submitLabel={t("schedules.createTitle", "Create schedule")}
          redirectTo="/schedules"
        />
      </section>
    </div>
  );
}
