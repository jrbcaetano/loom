import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { ExpensesClient } from "@/features/expenses/expenses-client";

export default async function ExpensesPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Track household costs and who paid.</p>
        <Link href="/expenses/new" className="loom-button-primary">
          New expense
        </Link>
      </div>
      <ExpensesClient familyId={context.activeFamilyId} />
    </div>
  );
}
