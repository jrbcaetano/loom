import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { DocumentForm } from "@/features/documents/document-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NewDocumentPage() {
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
          <h2 className="loom-module-title">{t("documents.createTitle", "Create document")}</h2>
          <p className="loom-module-subtitle">{t("documents.createSubtitle", "Store key records and optional file links for your family.")}</p>
        </div>
      </section>
      <section className="loom-card p-5">
        <DocumentForm
          familyId={context.activeFamilyId}
          endpoint="/api/documents"
          method="POST"
          submitLabel={t("documents.createTitle", "Create document")}
          redirectTo="/documents"
        />
      </section>
    </div>
  );
}
