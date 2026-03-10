import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { EventForm } from "@/features/events/event-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NewEventPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const members = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }));

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("calendar.createTitle", "Create event")}</h2>
          <p className="loom-module-subtitle">{t("calendar.createSubtitle", "Add shared or private events to the family calendar.")}</p>
        </div>
      </section>
      <section className="loom-card p-5">
        <EventForm
          familyId={context.activeFamilyId}
          members={members}
          endpoint="/api/events"
          method="POST"
          submitLabel={t("calendar.createTitle", "Create event")}
          redirectTo="/calendar"
        />
      </section>
    </div>
  );
}
