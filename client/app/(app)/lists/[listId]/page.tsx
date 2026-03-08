import Link from "next/link";
import { notFound } from "next/navigation";
import { getListById } from "@/features/lists/server";
import { ListItemsClient } from "@/features/lists/list-items-client";
import { getFamilyMembers } from "@/features/families/server";
import { ListForm } from "@/features/lists/list-form";
import { VisibilityBadge } from "@/components/common/visibility-badge";

type ListDetailPageProps = {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ListDetailPage({ params, searchParams }: ListDetailPageProps) {
  const { listId } = await params;
  const query = await searchParams;
  const list = await getListById(listId);

  if (!list) {
    notFound();
  }

  const members = (await getFamilyMembers(list.familyId))
    .filter((member) => member.userId)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }));

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{list.title}</h2>
            {list.description ? <p className="loom-muted mt-1">{list.description}</p> : null}
          </div>
          <VisibilityBadge visibility={list.visibility} />
        </div>

        <div className="mt-4">
          <ListItemsClient listId={list.id} />
        </div>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">List settings</h3>
          <Link href={`/lists/${list.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close" : "Edit"}
          </Link>
        </div>

        {query.edit === "1" ? (
          <div className="mt-4">
            <ListForm
              familyId={list.familyId}
              members={members}
              redirectTo={`/lists/${list.id}`}
              endpoint={`/api/lists/${list.id}`}
              method="PATCH"
              submitLabel="Save list"
              initialValues={{ title: list.title, description: list.description ?? "", visibility: list.visibility }}
            />
          </div>
        ) : (
          <p className="loom-muted mt-2">Use edit mode to change title, description, and visibility.</p>
        )}
      </section>
    </div>
  );
}
