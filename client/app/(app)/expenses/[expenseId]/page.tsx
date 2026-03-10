import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { DeleteButton } from "@/components/common/delete-button";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { getExpenseById } from "@/features/expenses/server";
import { getServerI18n } from "@/lib/i18n/server";

type ExpenseDetailPageProps = {
  params: Promise<{ expenseId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ExpenseDetailPage({ params, searchParams }: ExpenseDetailPageProps) {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  const { expenseId } = await params;
  const query = await searchParams;

  const expense = await getExpenseById(expenseId);
  if (!expense) notFound();

  const members = context.activeFamilyId
    ? (await getFamilyMembers(context.activeFamilyId))
        .filter((member) => member.userId)
        .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }))
    : [];

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{expense.title}</h2>
          <p className="loom-module-subtitle">
            {Number(expense.amount).toFixed(2)} {expense.currency} - {expense.date}
          </p>
        </div>
        <Link href={`/expenses/${expense.id}${query.edit === "1" ? "" : "?edit=1"}`} className="loom-button-ghost">
          {query.edit === "1" ? t("common.closeEdit", "Close edit") : t("expenses.edit", "Edit expense")}
        </Link>
      </section>

      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("common.details", "Details")}</h3>
          <p className="loom-home-pill is-muted m-0">{expense.category ?? t("common.uncategorized", "Uncategorized")}</p>
        </div>
        <div className="loom-info-grid mt-4">
          <article className="loom-info-item">
            <p className="loom-info-label">{t("expenses.amount", "Amount")}</p>
            <p className="loom-info-value">
              {Number(expense.amount).toFixed(2)} {expense.currency}
            </p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.date", "Date")}</p>
            <p className="loom-info-value">{expense.date}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("common.category", "Category")}</p>
            <p className="loom-info-value">{expense.category ?? t("common.uncategorized", "Uncategorized")}</p>
          </article>
          <article className="loom-info-item">
            <p className="loom-info-label">{t("expenses.paidBy", "Paid by")}</p>
            <p className="loom-info-value">{expense.paid_by_user_id ? t("expenses.familyMember", "Family member") : t("common.unknown", "Unknown")}</p>
          </article>
        </div>
        <p className="m-0 mt-3">{expense.notes ?? t("expenses.noNotes", "No notes for this expense.")}</p>
      </section>

      {query.edit === "1" ? (
        <section className="loom-card p-5">
          <h3 className="loom-section-title">{t("expenses.edit", "Edit expense")}</h3>
          <div className="mt-4">
            <ExpenseForm
              familyId={expense.family_id}
              members={members}
              endpoint={`/api/expenses/${expense.id}`}
              method="PATCH"
              submitLabel={t("expenses.save", "Save expense")}
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
            <DeleteButton endpoint={`/api/expenses/${expense.id}`} redirectTo="/expenses" label={t("expenses.delete", "Delete expense")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
