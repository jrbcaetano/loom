import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { TaskForm } from "@/features/tasks/task-form";

export default async function NewTaskPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const members = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }));

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">Create task</h2>
      <div className="mt-4">
        <TaskForm familyId={context.activeFamilyId} members={members} endpoint="/api/tasks" method="POST" submitLabel="Create task" redirectTo="/tasks" />
      </div>
    </section>
  );
}
