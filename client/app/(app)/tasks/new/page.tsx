import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { TaskForm } from "@/features/tasks/task-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NewTaskPage() {
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
    <div className="loom-stack">
      <section className="loom-home-greeting">
        <h2 className="loom-page-title-xl">{t("tasks.createTitle", "Create task")}</h2>
      </section>

      <section className="loom-card p-5">
        <TaskForm
          familyId={context.activeFamilyId}
          members={members}
          endpoint="/api/tasks"
          method="POST"
          submitLabel={t("tasks.createTitle", "Create task")}
          defaultAssigneeUserId={user.id}
          cancelHref="/tasks"
          redirectTo="/tasks"
        />
      </section>
    </div>
  );
}
