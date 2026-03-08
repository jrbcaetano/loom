import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { NotesClient } from "@/features/notes/notes-client";

export default async function NotesPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Shared family knowledge and important references.</p>
        <Link href="/notes/new" className="loom-button-primary">
          New note
        </Link>
      </div>
      <NotesClient familyId={context.activeFamilyId} />
    </div>
  );
}
