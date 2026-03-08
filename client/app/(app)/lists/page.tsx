import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getListsForFamily } from "@/features/lists/server";
import { VisibilityBadge } from "@/components/common/visibility-badge";

export default async function ListsPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family to use lists.</p>;
  }

  const lists = await getListsForFamily(context.activeFamilyId);

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Shared and private lists in one place.</p>
        <Link href="/lists/new" className="loom-button-primary">
          New list
        </Link>
      </div>

      <div className="loom-stack-sm">
        {lists.length === 0 ? <p className="loom-muted">No lists yet.</p> : null}
        {lists.map((list) => (
          <Link key={list.id} href={`/lists/${list.id}`} className="loom-card p-4 block">
            <div className="loom-row-between">
              <div>
                <p className="m-0 font-semibold">{list.title}</p>
                {list.description ? <p className="loom-muted small mt-1">{list.description}</p> : null}
              </div>
              <VisibilityBadge visibility={list.visibility} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
