import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { getRoutineById } from "@/features/routines/server";
import { RoutineForm } from "@/features/routines/routine-form";

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
  const { routineId } = await params;
  const query = await searchParams;
  const routine = await getRoutineById(routineId);
  if (!routine) notFound();

  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  const members = context.activeFamilyId
    ? (await getFamilyMembers(context.activeFamilyId))
        .filter((member) => member.userId)
        .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }))
    : [];

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{routine.title}</h2>
            <p className="loom-muted mt-2 capitalize">{routine.schedule_type}</p>
          </div>
          <Link href={`/routines/${routine.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close edit" : "Edit"}
          </Link>
        </div>

        <div className="mt-4">
          <p className="m-0 font-semibold">Steps</p>
          <div className="loom-stack-xs mt-2">
            {((routine.steps ?? []) as RoutineStep[]).map((step) => (
              <p key={step.id} className="m-0">
                {step.sort_order + 1}. {step.text}
              </p>
            ))}
          </div>
        </div>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">Edit routine</h3>
          <div className="mt-4">
            <RoutineForm
              familyId={routine.family_id}
              members={members}
              endpoint={`/api/routines/${routine.id}`}
              method="PATCH"
              submitLabel="Save routine"
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
            <DeleteButton endpoint={`/api/routines/${routine.id}`} redirectTo="/routines" label="Delete routine" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
