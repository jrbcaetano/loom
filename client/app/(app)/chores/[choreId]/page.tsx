import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { ChoreForm } from "@/features/chores/chore-form";
import { getChoreById } from "@/features/chores/server";
import { getServerI18n } from "@/lib/i18n/server";

type ChoreDetailPageProps = {
  params: Promise<{ choreId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ChoreDetailPage({ params, searchParams }: ChoreDetailPageProps) {
  const { t } = await getServerI18n();
  const { choreId } = await params;
  const query = await searchParams;
  const chore = await getChoreById(choreId);
  if (!chore) notFound();

  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  const members = context.activeFamilyId
    ? (await getFamilyMembers(context.activeFamilyId))
        .filter((member) => member.userId)
        .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }))
    : [];

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{chore.title}</h2>
          <p className="loom-module-subtitle">
            {chore.points} {t("home.points", "points")} {chore.due_date ? `- ${t("tasks.due", "Due").toLowerCase()} ${chore.due_date}` : ""}
          </p>
        </div>
        <Link href={`/chores/${chore.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
          {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("chores.edit", "Edit chore")}
        </Link>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("common.description", "Description")}</h3>
          <span className="loom-home-pill is-muted">{chore.status}</span>
        </div>
        <div className="loom-info-grid mt-4">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("chores.points", "Points")}</p>
            <p className="loom-info-value">{chore.points}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("tasks.due", "Due")} {t("common.date", "date").toLowerCase()}</p>
            <p className="loom-info-value">{chore.due_date ?? t("common.notSet", "Not set")}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("tasks.status", "Status")}</p>
            <p className="loom-info-value">{chore.status}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("tasks.assignee", "Assignee")}</p>
            <p className="loom-info-value">{chore.assigned_to_user_id ? t("expenses.familyMember", "Family member") : t("tasks.unassigned", "Unassigned")}</p>
          </article>
        </div>
        <p className="m-0 mt-3">{chore.description ?? t("common.noDescription", "No description.")}</p>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("chores.edit", "Edit chore")}</h3>
          <div className="mt-4">
            <ChoreForm
              familyId={chore.family_id}
              members={members}
              endpoint={`/api/chores/${chore.id}`}
              method="PATCH"
              submitLabel={t("chores.save", "Save chore")}
              redirectTo={`/chores/${chore.id}`}
              initialValues={{
                title: chore.title,
                description: chore.description ?? "",
                assignedToUserId: chore.assigned_to_user_id ?? "",
                points: chore.points,
                dueDate: chore.due_date ?? "",
                status: chore.status
              }}
            />
          </div>
          <div className="mt-4">
            <DeleteButton endpoint={`/api/chores/${chore.id}`} redirectTo="/chores" label={t("chores.delete", "Delete chore")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
