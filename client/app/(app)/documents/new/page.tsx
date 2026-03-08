import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { DocumentForm } from "@/features/documents/document-form";

export default async function NewDocumentPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  return (
    <section className="loom-card p-5">
      <h2 className="loom-section-title">Create document</h2>
      <div className="mt-4">
        <DocumentForm familyId={context.activeFamilyId} endpoint="/api/documents" method="POST" submitLabel="Create document" redirectTo="/documents" />
      </div>
    </section>
  );
}
