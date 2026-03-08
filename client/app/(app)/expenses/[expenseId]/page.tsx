import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { DeleteButton } from "@/components/common/delete-button";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { getExpenseById } from "@/features/expenses/server";

type ExpenseDetailPageProps = {
  params: Promise<{ expenseId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ExpenseDetailPage({ params, searchParams }: ExpenseDetailPageProps) {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);
  const { expenseId } = await params;
  const query = await searchParams;

  const expense = await getExpenseById(expenseId);
  if (!expense) notFound();

  const members = context.activeFamilyId
    ? (await getFamilyMembers(context.activeFamilyId))
        .filter((member) => member.userId)
        .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }))
    : [];

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div>
            <h2 className="loom-section-title">{expense.title}</h2>
            <p className="loom-muted mt-2">
              {Number(expense.amount).toFixed(2)} {expense.currency} - {expense.date}
            </p>
          </div>
          <Link href={`/expenses/${expense.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-subtle-link">
            {query.edit === "1" ? "Close edit" : "Edit"}
          </Link>
        </div>
        <p className="m-0 mt-3">{expense.notes ?? "No notes"}</p>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">Edit expense</h3>
          <div className="mt-4">
            <ExpenseForm
              familyId={expense.family_id}
              members={members}
              endpoint={`/api/expenses/${expense.id}`}
              method="PATCH"
              submitLabel="Save expense"
              redirectTo={`/expenses/${expense.id}`}
              initialValues={{
                title: expense.title,
                amount: Number(expense.amount),
                currency: expense.currency,
                category: expense.category ?? "",
                paidByUserId: expense.paid_by_user_id ?? "",
                date: expense.date,
                notes: expense.notes ?? ""
              }}
            />
          </div>
          <div className="mt-4">
            <DeleteButton endpoint={`/api/expenses/${expense.id}`} redirectTo="/expenses" label="Delete expense" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
