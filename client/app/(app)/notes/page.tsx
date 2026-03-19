import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { NotesClient } from "@/features/notes/notes-client";
import { getNotes } from "@/features/notes/server";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotesPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }
  const initialNotes = await getNotes(context.activeFamilyId);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.notes", "Notes")}</h2>
          <p className="loom-module-subtitle">{t("notes.subtitle", "Shared family knowledge and important references.")}</p>
        </div>
        <Link href="/notes/new" className="loom-button-primary">
          {t("notes.new", "New note")}
        </Link>
      </section>
      <NotesClient familyId={context.activeFamilyId} initialNotes={initialNotes} />
    </div>
  );
}
