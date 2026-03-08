import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { TasksClient } from "@/features/tasks/tasks-client";

export default async function TasksPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family to use tasks.</p>;
  }

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Track household work and personal tasks in one board.</p>
        <Link href="/tasks/new" className="loom-button-primary">
          New task
        </Link>
      </div>

      <TasksClient familyId={context.activeFamilyId} />
    </div>
  );
}
