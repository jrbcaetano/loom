import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { ChoreForm } from "@/features/chores/chore-form";
import { getChoreById } from "@/features/chores/server";

type ChoreDetailPageProps = {
  params: Promise<{ choreId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ChoreDetailPage({ params, searchParams }: ChoreDetailPageProps) {
  const { choreId } = await params;
  const query = await searchParams;
  const chore = await getChoreById(choreId);
  if (!chore) notFound();

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
            <h2 className="loom-section-title">{chore.title}</h2>
            <p className="loom-muted mt-2">
              {chore.points} points {chore.due_date ? `- due ${chore.due_date}` : ""}
            </p>
          </div>
          <Link href={`/chores/${chore.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close edit" : "Edit"}
          </Link>
        </div>
        <p className="m-0 mt-3">{chore.description ?? "No description"}</p>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">Edit chore</h3>
          <div className="mt-4">
            <ChoreForm
              familyId={chore.family_id}
              members={members}
              endpoint={`/api/chores/${chore.id}`}
              method="PATCH"
              submitLabel="Save chore"
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
            <DeleteButton endpoint={`/api/chores/${chore.id}`} redirectTo="/chores" label="Delete chore" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
