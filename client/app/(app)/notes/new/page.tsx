import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { NoteForm } from "@/features/notes/note-form";

export default async function NewNotePage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">Create note</h2>
      <div className="mt-4">
        <NoteForm familyId={context.activeFamilyId} endpoint="/api/notes" method="POST" submitLabel="Create note" redirectTo="/notes" />
      </div>
    </section>
  );
}
