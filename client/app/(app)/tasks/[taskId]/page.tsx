import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaskById } from "@/features/tasks/server";
import { getFamilyMembers } from "@/features/families/server";
import { TaskForm } from "@/features/tasks/task-form";
import { VisibilityBadge } from "@/components/common/visibility-badge";

type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

function formatDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function TaskDetailPage({ params, searchParams }: TaskDetailPageProps) {
  const { taskId } = await params;
  const query = await searchParams;
  const task = await getTaskById(taskId);

  if (!task) {
    notFound();
  }

  const members = (await getFamilyMembers(task.familyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }));

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{task.title}</h2>
            <p className="loom-muted mt-1">{task.description ?? "No description"}</p>
          </div>
          <VisibilityBadge visibility={task.visibility} />
        </div>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">Task settings</h3>
          <Link href={`/tasks/${task.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close" : "Edit"}
          </Link>
        </div>

        {query.edit === "1" ? (
          <div className="mt-4">
            <TaskForm
              familyId={task.familyId}
              members={members}
              endpoint={`/api/tasks/${task.id}`}
              method="PATCH"
              submitLabel="Save task"
              redirectTo={`/tasks/${task.id}`}
              initialValues={{
                title: task.title,
                description: task.description ?? "",
                status: task.status,
                priority: task.priority,
                visibility: task.visibility,
                assignedToUserId: task.assignedToUserId ?? "",
                startAt: formatDateTimeLocal(task.startAt),
                dueAt: formatDateTimeLocal(task.dueAt)
              }}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
