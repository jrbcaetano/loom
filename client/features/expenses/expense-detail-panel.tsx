"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import {
  EntityAssigneeBadge,
  EntityMetadataGrid,
  EntityMetadataItem,
  EntitySection,
  EntitySummaryMeta,
  EntitySummaryMetaItem
} from "@/components/patterns/entity-metadata";
import { EntityActivityStream } from "@/components/patterns/entity-activity-stream";
import type { EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { buildLifecycleActivityEntries } from "@/features/entities/entity-activity-adapters";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { useI18n } from "@/lib/i18n/context";

type ExpenseDetail = {
  id: string;
  family_id: string;
  title: string;
  amount: number;
  currency: string;
  category: string | null;
  paid_by_user_id: string | null;
  date: string;
  notes: string | null;
  created_at: string;
};

type MemberOption = {
  userId: string;
  displayName: string;
};

async function fetchExpense(expenseId: string) {
  const response = await fetch(`/api/expenses/${expenseId}`, { cache: "no-store" });
  const payload = (await response.json()) as { expense?: ExpenseDetail | null; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load expense");
  }
  return payload.expense ?? null;
}

export function ExpenseDetailPanel({
  itemId,
  routeState,
  close,
  updateRouteState,
  members
}: EntityDetailRegistryEntryProps & {
  members: MemberOption[];
}) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const isEditing = routeState.panel === "edit";

  const expenseQuery = useQuery({
    queryKey: ["expense-detail", itemId],
    queryFn: () => fetchExpense(itemId)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/expenses/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete expense");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      close();
    }
  });

  const expense = expenseQuery.data;
  const paidByName =
    members.find((member) => member.userId === expense?.paid_by_user_id)?.displayName ?? t("common.unknown", "Unknown");
  const lifecycleEntries = expense
    ? buildLifecycleActivityEntries({
        entityName: t("expenses.detailTitle", "Expense"),
        createdAt: expense.created_at,
        updatedAt: expense.created_at,
        authorName: paidByName
      })
    : [];

  return (
    <EntityDetailShell
      isOpen
      title={expense?.title ?? t("expenses.detailTitle", "Expense")}
      eyebrow={t("nav.expenses", "Expenses")}
      subtitle={
        expense ? (
          <>
            {Number(expense.amount).toFixed(2)} {expense.currency} · {new Date(expense.date).toLocaleDateString(dateLocale)}
          </>
        ) : undefined
      }
      badge={expense?.category ? <span className="loom-home-pill is-muted m-0">{expense.category}</span> : undefined}
      summaryMeta={
        expense ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("expenses.amount", "Amount")} value={`${Number(expense.amount).toFixed(2)} ${expense.currency}`} />
            <EntitySummaryMetaItem label={t("expenses.paidBy", "Paid by")} value={paidByName} />
            <EntitySummaryMetaItem label={t("common.date", "Date")} value={new Date(expense.date).toLocaleDateString(dateLocale)} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
      headerActions={
        expense ? (
          <div className="loom-inline-actions">
            <button
              type="button"
              className="loom-button-ghost"
              onClick={() => updateRouteState({ panel: isEditing ? null : "edit" })}
            >
              {isEditing ? t("common.cancel", "Cancel") : t("expenses.edit", "Edit expense")}
            </button>
            <button type="button" className="loom-task-icon-button" aria-label={t("common.close", "Close")} onClick={close}>
              ×
            </button>
          </div>
        ) : undefined
      }
    >
      {expenseQuery.isPending ? <EntityDrawerLoadingState message={t("common.loading", "Loading...")} /> : null}
      {expenseQuery.error ? <EntityDrawerErrorState message={expenseQuery.error.message} /> : null}
      {!expenseQuery.isPending && !expenseQuery.error && !expense ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}

      {expense ? (
        <>
          <EntitySection title={t("common.details", "Details")}>
            <EntityMetadataGrid>
              <EntityMetadataItem
                label={t("expenses.amount", "Amount")}
                value={`${Number(expense.amount).toFixed(2)} ${expense.currency}`}
                emphasized
              />
              <EntityMetadataItem
                label={t("common.date", "Date")}
                value={new Date(expense.date).toLocaleDateString(dateLocale)}
              />
              <EntityMetadataItem
                label={t("common.category", "Category")}
                value={expense.category ?? t("common.uncategorized", "Uncategorized")}
              />
              <EntityMetadataItem
                label={t("expenses.paidBy", "Paid by")}
                value={<EntityAssigneeBadge value={paidByName} />}
              />
            </EntityMetadataGrid>
          </EntitySection>

          <EntitySection title={t("notes.label", "Notes")}>
            <p className="m-0">{expense.notes ?? t("expenses.noNotes", "No notes for this expense.")}</p>
          </EntitySection>

          <EntitySection title={t("common.activity", "Activity")}>
            <EntityActivityStream
              entries={lifecycleEntries}
              dateLocale={dateLocale}
              emptyState={<p className="loom-muted m-0">{t("tasks.noActivity", "No activity yet.")}</p>}
              countLabel={<span className="loom-home-pill is-muted">{lifecycleEntries.length}</span>}
            />
          </EntitySection>

          {isEditing ? (
            <EntitySection title={t("expenses.edit", "Edit expense")}>
              <ExpenseForm
                familyId={expense.family_id}
                members={members}
                endpoint={`/api/expenses/${expense.id}`}
                method="PATCH"
                submitLabel={t("expenses.save", "Save expense")}
                redirectTo="/expenses"
                disableRedirect
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["expenses"] });
                  queryClient.invalidateQueries({ queryKey: ["expense-detail", expense.id] });
                  updateRouteState({ panel: null });
                }}
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
              <div className="mt-4">
                <button
                  type="button"
                  className="loom-button-ghost loom-signout-danger"
                  onClick={() => {
                    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) {
                      return;
                    }
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("expenses.delete", "Delete expense")}
                </button>
                {deleteMutation.error ? <p className="loom-feedback-error mt-2">{deleteMutation.error.message}</p> : null}
              </div>
            </EntitySection>
          ) : null}
        </>
      ) : null}
    </EntityDetailShell>
  );
}

