import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { NoteForm } from "@/features/notes/note-form";
import { getNoteById } from "@/features/notes/server";

type NoteDetailPageProps = {
  params: Promise<{ noteId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function NoteDetailPage({ params, searchParams }: NoteDetailPageProps) {
  const { noteId } = await params;
  const query = await searchParams;
  const note = await getNoteById(noteId);
  if (!note) notFound();

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{note.title}</h2>
            <p className="loom-muted mt-2">{note.category ?? "Uncategorized"}</p>
          </div>
          <Link href={`/notes/${note.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close edit" : "Edit"}
          </Link>
        </div>
        <p className="m-0 mt-4 whitespace-pre-wrap">{note.content}</p>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">Edit note</h3>
          <div className="mt-4">
            <NoteForm
              familyId={note.family_id}
              endpoint={`/api/notes/${note.id}`}
              method="PATCH"
              submitLabel="Save note"
              redirectTo={`/notes/${note.id}`}
              initialValues={{
                title: note.title,
                content: note.content,
                category: note.category ?? ""
              }}
            />
          </div>
          <div className="mt-4">
            <DeleteButton endpoint={`/api/notes/${note.id}`} redirectTo="/notes" label="Delete note" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
