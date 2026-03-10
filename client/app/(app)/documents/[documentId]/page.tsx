import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { DocumentForm } from "@/features/documents/document-form";
import { getDocumentById } from "@/features/documents/server";
import { getServerI18n } from "@/lib/i18n/server";

type DocumentDetailPageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function DocumentDetailPage({ params, searchParams }: DocumentDetailPageProps) {
  const { t } = await getServerI18n();
  const { documentId } = await params;
  const query = await searchParams;
  const document = await getDocumentById(documentId);

  if (!document) {
    notFound();
  }

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{document.title}</h2>
          <p className="loom-module-subtitle">{document.category ?? t("common.uncategorized", "Uncategorized")}</p>
        </div>
        <Link href={`/documents/${document.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
          {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("documents.edit", "Edit document")}
        </Link>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("common.details", "Details")}</h3>
          {document.file_url ? (
            <a className="loom-subtle-link" href={document.file_url} target="_blank" rel="noreferrer">
              {t("documents.openAttachment", "Open attachment")}
            </a>
          ) : null}
        </div>
        <div className="loom-info-grid mt-4">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.category", "Category")}</p>
            <p className="loom-info-value">{document.category ?? t("common.uncategorized", "Uncategorized")}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("documents.attachment", "Attachment")}</p>
            <p className="loom-info-value">{document.file_url ? t("common.available", "Available") : t("common.none", "None")}</p>
          </article>
        </div>
        <p className="m-0 mt-3">{document.description ?? t("documents.noDescription", "No description.")}</p>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("documents.edit", "Edit document")}</h3>
          <div className="mt-4">
            <DocumentForm
              familyId={document.family_id}
              endpoint={`/api/documents/${document.id}`}
              method="PATCH"
              submitLabel={t("documents.save", "Save document")}
              redirectTo={`/documents/${document.id}`}
              initialValues={{
                title: document.title,
                description: document.description ?? "",
                category: document.category ?? "",
                fileUrl: document.file_url ?? ""
              }}
            />
          </div>
          <div className="mt-4">
            <DeleteButton endpoint={`/api/documents/${document.id}`} redirectTo="/documents" label={t("documents.delete", "Delete document")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
