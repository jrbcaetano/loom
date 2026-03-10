"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const expenseFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  amount: z.number().nonnegative(),
  currency: z.string().trim().min(1).max(10),
  category: z.string().trim().max(120).optional(),
  paidByUserId: z.string().optional(),
  date: z.string().date(),
  notes: z.string().trim().max(2000).optional()
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
type MemberOption = { userId: string; displayName: string };

export function ExpenseForm({
  familyId,
  members,
  endpoint,
  method,
  submitLabel,
  redirectTo,
  initialValues
}: {
  familyId: string;
  members: MemberOption[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: Partial<ExpenseFormValues>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      amount: initialValues?.amount ?? 0,
      currency: initialValues?.currency ?? "EUR",
      category: initialValues?.category ?? "",
      paidByUserId: initialValues?.paidByUserId ?? "",
      date: initialValues?.date ?? new Date().toISOString().slice(0, 10),
      notes: initialValues?.notes ?? ""
    }
  });

  async function onSubmit(values: ExpenseFormValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        amount: values.amount,
        currency: values.currency,
        category: values.category || null,
        paidByUserId: values.paidByUserId || null,
        date: values.date,
        notes: values.notes || null
      })
    });

    const payload = (await response.json().catch(() => null)) as { expenseId?: string; error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("expenses.saveError", "Failed to save expense"));
      setIsLoading(false);
      return;
    }

    const next = payload?.expenseId ? `/expenses/${payload.expenseId}` : redirectTo;
    router.push(next);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("common.title", "Title")}</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>
      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("expenses.amount", "Amount")}</span>
          <input className="loom-input" type="number" step="0.01" min={0} {...form.register("amount", { valueAsNumber: true })} />
        </label>
        <label className="loom-field">
          <span>{t("expenses.currency", "Currency")}</span>
          <input className="loom-input" type="text" {...form.register("currency")} />
        </label>
      </div>
      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("common.category", "Category")}</span>
          <input className="loom-input" type="text" {...form.register("category")} />
        </label>
        <label className="loom-field">
          <span>{t("common.date", "Date")}</span>
          <input className="loom-input" type="date" {...form.register("date")} />
        </label>
      </div>
      <label className="loom-field">
        <span>{t("expenses.paidBy", "Paid by")}</span>
        <select className="loom-input" {...form.register("paidByUserId")}>
          <option value="">{t("common.unknown", "Unknown")}</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="loom-field">
        <span>{t("notes.label", "Notes")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("notes")} />
      </label>
      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("common.saving", "Saving...") : submitLabel}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
