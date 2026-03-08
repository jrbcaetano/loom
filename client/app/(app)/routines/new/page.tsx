import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { RoutineForm } from "@/features/routines/routine-form";

export default async function NewRoutinePage() {
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
      <h2 className="loom-section-title">Create routine</h2>
      <div className="mt-4">
        <RoutineForm familyId={context.activeFamilyId} members={members} endpoint="/api/routines" method="POST" submitLabel="Create routine" redirectTo="/routines" />
      </div>
    </section>
  );
}
