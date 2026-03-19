"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string | null;
  date: string;
};

type MonthlySummary = {
  month: string;
  total: number;
};

async function fetchExpenses(familyId: string, search: string) {
  const params = new URLSearchParams({ familyId });
  if (search.trim()) params.set("search", search.trim());
  const response = await fetch(`/api/expenses?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as { expenses?: ExpenseRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load expenses");
  return payload.expenses ?? [];
}

async function fetchSummary(familyId: string) {
  const response = await fetch(`/api/expenses?familyId=${familyId}&mode=summary`, { cache: "no-store" });
  const payload = (await response.json()) as { summary?: MonthlySummary[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load summary");
  return payload.summary ?? [];
}

export function ExpensesClient({
  familyId,
  initialExpenses = [],
  initialSummary = []
}: {
  familyId: string;
  initialExpenses?: ExpenseRow[];
  initialSummary?: MonthlySummary[];
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const expensesQuery = useQuery({
    queryKey: ["expenses", familyId, search],
    queryFn: () => fetchExpenses(familyId, search),
    initialData: search.trim().length === 0 ? initialExpenses : undefined
  });

  const summaryQuery = useQuery({
    queryKey: ["expenses-summary", familyId],
    queryFn: () => fetchSummary(familyId),
    initialData: initialSummary
  });

  return (
    <div className="loom-stack">
      <section className="loom-card loom-filter-card">
        <div className="loom-filter-row">
          <label className="loom-field">
            <span>{t("common.search", "Search")}</span>
            <input className="loom-input" type="search" placeholder={t("expenses.searchPlaceholder", "Search expenses by title")} value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <article className="loom-soft-row">
            <p className="m-0 text-sm text-muted-foreground">{t("expenses.entries", "Entries")}</p>
            <p className="m-0 mt-1 text-lg font-semibold">{expensesQuery.data?.length ?? 0}</p>
          </article>
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("nav.expenses", "Expenses")}</h2>
        {expensesQuery.isPending ? <p className="loom-muted mt-3">{t("expenses.loading", "Loading expenses...")}</p> : null}
        {expensesQuery.error ? <p className="loom-feedback-error mt-3">{expensesQuery.error.message}</p> : null}
        <div className="loom-stack-sm mt-3">
          {(expensesQuery.data ?? []).map((expense) => (
            <article key={expense.id} className="loom-conversation-row">
              <div className="loom-row-between">
                <Link href={`/expenses/${expense.id}`} className="loom-link-strong">
                  {expense.title}
                </Link>
                <p className="m-0 font-semibold">
                  {Number(expense.amount).toFixed(2)} {expense.currency}
                </p>
              </div>
              <p className="loom-muted small mt-1">
                {expense.category ?? t("common.uncategorized", "Uncategorized")} - {expense.date}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("expenses.monthlySummary", "Monthly summary")}</h2>
        {summaryQuery.isPending ? <p className="loom-muted mt-3">{t("expenses.loadingSummary", "Loading summary...")}</p> : null}
        <div className="loom-kpi-grid mt-3">
          {(summaryQuery.data ?? []).slice(0, 6).map((row) => (
            <article key={row.month} className="loom-soft-row">
              <p className="m-0 text-sm text-muted-foreground">{row.month}</p>
              <p className="m-0 mt-1 text-lg font-semibold">{row.total.toFixed(2)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
