import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/common/delete-button";
import { DocumentForm } from "@/features/documents/document-form";
import { getDocumentById } from "@/features/documents/server";

type DocumentDetailPageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function DocumentDetailPage({ params, searchParams }: DocumentDetailPageProps) {
  const { documentId } = await params;
  const query = await searchParams;
  const document = await getDocumentById(documentId);

  if (!document) {
    notFound();
  }

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{document.title}</h2>
            <p className="loom-muted mt-2">{document.category ?? "Uncategorized"}</p>
          </div>
          <Link href={`/documents/${document.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close edit" : "Edit"}
          </Link>
        </div>
        <p className="m-0 mt-3">{document.description ?? "No description"}</p>
        {document.file_url ? (
          <p className="m-0 mt-3">
            <a className="loom-subtle-link" href={document.file_url} target="_blank" rel="noreferrer">
              Open attachment
            </a>
          </p>
        ) : null}
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">Edit document</h3>
          <div className="mt-4">
            <DocumentForm
              familyId={document.family_id}
              endpoint={`/api/documents/${document.id}`}
              method="PATCH"
              submitLabel="Save document"
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
            <DeleteButton endpoint={`/api/documents/${document.id}`} redirectTo="/documents" label="Delete document" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
