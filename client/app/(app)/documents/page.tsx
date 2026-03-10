import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { DocumentsClient } from "@/features/documents/documents-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function DocumentsPage() {
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
          <h2 className="loom-module-title">{t("nav.documents", "Documents")}</h2>
          <p className="loom-module-subtitle">{t("documents.subtitle", "Store important household records, references, and files.")}</p>
        </div>
        <Link href="/documents/new" className="loom-button-primary">
          {t("documents.new", "New document")}
        </Link>
      </section>
      <DocumentsClient familyId={context.activeFamilyId} />
    </div>
  );
}
