import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { ListForm } from "@/features/lists/list-form";

export default async function NewListPage() {
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
      <h2 className="loom-section-title">Create list</h2>
      <p className="loom-muted mt-1">Use shared lists for groceries and household tasks.</p>
      <div className="mt-4">
        <ListForm familyId={context.activeFamilyId} members={members} redirectTo="/lists" endpoint="/api/lists" method="POST" submitLabel="Create list" />
      </div>
    </section>
  );
}
