"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

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

export function ExpensesClient({ familyId }: { familyId: string }) {
  const [search, setSearch] = useState("");

  const expensesQuery = useQuery({
    queryKey: ["expenses", familyId, search],
    queryFn: () => fetchExpenses(familyId, search)
  });

  const summaryQuery = useQuery({
    queryKey: ["expenses-summary", familyId],
    queryFn: () => fetchSummary(familyId)
  });

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <label className="loom-field">
          <span>Search</span>
          <input className="loom-input" type="search" placeholder="Search expenses by title" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Expenses</h2>
        {expensesQuery.isPending ? <p className="loom-muted mt-3">Loading expenses...</p> : null}
        {expensesQuery.error ? <p className="loom-feedback-error mt-3">{expensesQuery.error.message}</p> : null}
        <div className="loom-stack-sm mt-3">
          {(expensesQuery.data ?? []).map((expense) => (
            <article key={expense.id} className="loom-card soft p-4">
              <div className="loom-row-between">
                <Link href={`/expenses/${expense.id}`} className="loom-link-strong">
                  {expense.title}
                </Link>
                <p className="m-0 font-semibold">
                  {Number(expense.amount).toFixed(2)} {expense.currency}
                </p>
              </div>
              <p className="loom-muted small mt-1">
                {expense.category ?? "Uncategorized"} - {expense.date}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Monthly summary</h2>
        {summaryQuery.isPending ? <p className="loom-muted mt-3">Loading summary...</p> : null}
        <div className="loom-stack-sm mt-3">
          {(summaryQuery.data ?? []).slice(0, 6).map((row) => (
            <p key={row.month} className="m-0">
              <strong>{row.month}</strong>: {row.total.toFixed(2)}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
