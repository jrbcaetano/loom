import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { ChoreForm } from "@/features/chores/chore-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NewChorePage() {
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
          <h2 className="loom-module-title">{t("chores.createTitle", "Create chore")}</h2>
          <p className="loom-module-subtitle">{t("chores.createSubtitle", "Assign chores with points and due dates.")}</p>
        </div>
      </section>
      <section className="loom-card p-5">
        <ChoreForm familyId={context.activeFamilyId} members={members} endpoint="/api/chores" method="POST" submitLabel={t("chores.createTitle", "Create chore")} redirectTo="/chores" />
      </section>
    </div>
  );
}
