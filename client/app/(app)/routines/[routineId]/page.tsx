import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { getRoutineById } from "@/features/routines/server";
import { RoutineForm } from "@/features/routines/routine-form";
import { getServerI18n } from "@/lib/i18n/server";

type RoutineStep = {
  id: string;
  text: string;
  sort_order: number;
};

type RoutineDetailPageProps = {
  params: Promise<{ routineId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function RoutineDetailPage({ params, searchParams }: RoutineDetailPageProps) {
  const { t } = await getServerI18n();
  const { routineId } = await params;
  const query = await searchParams;
  const routine = await getRoutineById(routineId);
  if (!routine) notFound();

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
          <h2 className="loom-module-title">{routine.title}</h2>
          <p className="loom-module-subtitle capitalize">{routine.schedule_type} {t("routines.routine", "routine")}</p>
        </div>
        <Link href={`/routines/${routine.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
          {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("routines.edit", "Edit routine")}
        </Link>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("routines.checklistSteps", "Checklist steps")}</h3>
          <p className="loom-home-pill is-muted m-0">{((routine.steps ?? []) as RoutineStep[]).length} {t("routines.steps", "steps")}</p>
        </div>
        <div className="loom-info-grid mt-4">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("routines.schedule", "Schedule")}</p>
            <p className="loom-info-value capitalize">{routine.schedule_type}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("tasks.assignee", "Assignee")}</p>
            <p className="loom-info-value">{routine.assigned_to_user_id ? t("expenses.familyMember", "Family member") : t("tasks.unassigned", "Unassigned")}</p>
          </article>
        </div>

        <div className="mt-4 loom-stack-sm">
          {((routine.steps ?? []) as RoutineStep[]).map((step) => (
            <p key={step.id} className="loom-soft-row m-0">
              {step.sort_order + 1}. {step.text}
            </p>
          ))}
        </div>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("routines.edit", "Edit routine")}</h3>
          <div className="mt-4">
            <RoutineForm
              familyId={routine.family_id}
              members={members}
              endpoint={`/api/routines/${routine.id}`}
              method="PATCH"
              submitLabel={t("routines.save", "Save routine")}
              redirectTo={`/routines/${routine.id}`}
              initialValues={{
                title: routine.title,
                assignedToUserId: routine.assigned_to_user_id ?? "",
                scheduleType: routine.schedule_type,
                steps: ((routine.steps ?? []) as RoutineStep[]).map((step) => ({ text: step.text }))
              }}
            />
          </div>
          <div className="mt-4">
            <DeleteButton endpoint={`/api/routines/${routine.id}`} redirectTo="/routines" label={t("routines.delete", "Delete routine")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
