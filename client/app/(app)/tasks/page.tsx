import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { TasksClient } from "@/features/tasks/tasks-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function TasksPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("tasks.createFamilyFirst", "Create a family to use tasks.")}</p>;
  }

  const assignees = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId)
    .map((member) => ({
      userId: member.userId!,
      displayName: member.fullName ?? member.email ?? t("common.member", "Member"),
      avatarUrl: member.avatarUrl
    }));

  return (
    <div className="loom-module-page loom-tasks-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.tasks", "Tasks")}</h2>
          <p className="loom-module-subtitle">{t("tasks.subtitle", "Track daily priorities and household progress.")}</p>
        </div>
        <Link href="/tasks/new" className="loom-button-primary">
          {t("tasks.new", "New task")}
        </Link>
      </section>

      <TasksClient familyId={context.activeFamilyId} assignees={assignees} />
    </div>
  );
}
