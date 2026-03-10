import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { NoteForm } from "@/features/notes/note-form";
import { getNoteById } from "@/features/notes/server";
import { getServerI18n } from "@/lib/i18n/server";

type NoteDetailPageProps = {
  params: Promise<{ noteId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function NoteDetailPage({ params, searchParams }: NoteDetailPageProps) {
  const { t } = await getServerI18n();
  const { noteId } = await params;
  const query = await searchParams;
  const note = await getNoteById(noteId);
  if (!note) notFound();

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{note.title}</h2>
          <p className="loom-module-subtitle">{note.category ?? t("common.uncategorized", "Uncategorized")}</p>
        </div>
        <Link href={`/notes/${note.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
          {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("notes.edit", "Edit note")}
        </Link>
      </section>

      <section className="loom-card p-5">
        <h3 className="loom-section-title">{t("notes.content", "Content")}</h3>
        <div className="loom-info-grid mt-4">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.category", "Category")}</p>
            <p className="loom-info-value">{note.category ?? t("common.uncategorized", "Uncategorized")}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("notes.length", "Length")}</p>
            <p className="loom-info-value">{note.content.length} {t("notes.chars", "chars")}</p>
          </article>
        </div>
        <p className="m-0 mt-4 whitespace-pre-wrap">{note.content}</p>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("notes.edit", "Edit note")}</h3>
          <div className="mt-4">
            <NoteForm
              familyId={note.family_id}
              endpoint={`/api/notes/${note.id}`}
              method="PATCH"
              submitLabel={t("notes.save", "Save note")}
              redirectTo={`/notes/${note.id}`}
              initialValues={{
                title: note.title,
                content: note.content,
                category: note.category ?? ""
              }}
            />
          </div>
          <div className="mt-4">
            <DeleteButton endpoint={`/api/notes/${note.id}`} redirectTo="/notes" label={t("notes.delete", "Delete note")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
