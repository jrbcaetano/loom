import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { ChoresClient } from "@/features/chores/chores-client";

export default async function ChoresPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Assign chores and reward completed work with points.</p>
        <Link href="/chores/new" className="loom-button-primary">
          New chore
        </Link>
      </div>
      <ChoresClient familyId={context.activeFamilyId} />
    </div>
  );
}
