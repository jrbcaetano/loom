import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { DocumentsClient } from "@/features/documents/documents-client";

export default async function DocumentsPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Store important household records and links.</p>
        <Link href="/documents/new" className="loom-button-primary">
          New document
        </Link>
      </div>
      <DocumentsClient familyId={context.activeFamilyId} />
    </div>
  );
}
