import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { RoutinesClient } from "@/features/routines/routines-client";

export default async function RoutinesPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Recurring checklists for daily and weekly household routines.</p>
        <Link href="/routines/new" className="loom-button-primary">
          New routine
        </Link>
      </div>
      <RoutinesClient familyId={context.activeFamilyId} />
    </div>
  );
}
