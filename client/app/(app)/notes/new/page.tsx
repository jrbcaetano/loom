import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { NoteForm } from "@/features/notes/note-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NewNotePage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("notes.createTitle", "Create note")}</h2>
          <p className="loom-module-subtitle">{t("notes.createSubtitle", "Capture important family information and references.")}</p>
        </div>
      </section>
      <section className="loom-card p-5">
        <NoteForm familyId={context.activeFamilyId} endpoint="/api/notes" method="POST" submitLabel={t("notes.createTitle", "Create note")} redirectTo="/notes" />
      </section>
    </div>
  );
}
