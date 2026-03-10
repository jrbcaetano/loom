import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaskById } from "@/features/tasks/server";
import { getFamilyMembers } from "@/features/families/server";
import { TaskForm } from "@/features/tasks/task-form";
import { VisibilityBadge } from "@/components/common/visibility-badge";
import { getServerI18n } from "@/lib/i18n/server";

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

function formatDisplayDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Date(value).toLocaleString(locale);
}

export default async function TaskDetailPage({ params, searchParams }: TaskDetailPageProps) {
  const { t, locale } = await getServerI18n();
  const { taskId } = await params;
  const query = await searchParams;
  const task = await getTaskById(taskId);

  if (!task) {
    notFound();
  }

  const members = (await getFamilyMembers(task.familyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }));

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{task.title}</h2>
          <p className="loom-module-subtitle">{task.description ?? t("common.noDescription", "No description")}</p>
        </div>
        <div className="loom-inline-actions">
          <VisibilityBadge visibility={task.visibility} />
          <Link href={`/tasks/${task.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
            {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("tasks.edit", "Edit task")}
          </Link>
        </div>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("tasks.settings", "Task settings")}</h3>
          <p className="loom-home-pill is-muted m-0">{task.status}</p>
        </div>
        <div className="loom-info-grid mt-4">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("tasks.priority", "Priority")}</p>
            <p className="loom-info-value">{task.priority}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.visibility", "Visibility")}</p>
            <p className="loom-info-value">{task.visibility}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("tasks.starts", "Starts")}</p>
            <p className="loom-info-value">{formatDisplayDate(task.startAt, locale === "pt" ? "pt-PT" : "en-US", t("common.notSet", "Not set"))}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("tasks.due", "Due")}</p>
            <p className="loom-info-value">{formatDisplayDate(task.dueAt, locale === "pt" ? "pt-PT" : "en-US", t("common.notSet", "Not set"))}</p>
          </article>
        </div>

        {query.edit === "1" ? (
          <div className="mt-4">
            <TaskForm
              familyId={task.familyId}
              members={members}
              endpoint={`/api/tasks/${task.id}`}
              method="PATCH"
              submitLabel={t("tasks.save", "Save task")}
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
