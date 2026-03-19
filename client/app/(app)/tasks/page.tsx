import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { TasksClient } from "@/features/tasks/tasks-client";
import { getServerI18n } from "@/lib/i18n/server";
import { getTaskLabels, getTasksForFamily } from "@/features/tasks/server";

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
  const [personalLabels, familyLabels, initialTasks] = await Promise.all([
    getTaskLabels({ scope: "personal" }),
    getTaskLabels({ scope: "family", familyId: context.activeFamilyId }),
    getTasksForFamily(context.activeFamilyId, { mine: true, status: "all", priority: "all" })
  ]);

  return (
    <div className="loom-module-page loom-tasks-page">
      <TasksClient
        familyId={context.activeFamilyId}
        currentUserId={user.id}
        assignees={assignees}
        personalLabels={personalLabels}
        familyLabels={familyLabels}
        initialTasks={initialTasks}
      />
    </div>
  );
}
