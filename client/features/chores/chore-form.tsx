"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const choreFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional(),
  assignedToUserId: z.string().optional(),
  points: z.number().int().nonnegative(),
  dueDate: z.string().optional(),
  status: z.enum(["todo", "done"])
});

type ChoreFormValues = z.infer<typeof choreFormSchema>;
type MemberOption = { userId: string; displayName: string };

export function ChoreForm({
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
  initialValues?: Partial<ChoreFormValues>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ChoreFormValues>({
    resolver: zodResolver(choreFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      assignedToUserId: initialValues?.assignedToUserId ?? "",
      points: initialValues?.points ?? 1,
      dueDate: initialValues?.dueDate ?? "",
      status: initialValues?.status ?? "todo"
    }
  });

  async function onSubmit(values: ChoreFormValues) {
    setServerError(null);
    setIsLoading(true);
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        description: values.description || null,
        assignedToUserId: values.assignedToUserId || null,
        points: values.points,
        dueDate: values.dueDate || null,
        status: values.status
      })
    });

    const payload = (await response.json().catch(() => null)) as { choreId?: string; error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("chores.saveError", "Failed to save chore"));
      setIsLoading(false);
      return;
    }

    const next = payload?.choreId ? `/chores/${payload.choreId}` : redirectTo;
    router.push(next);
    router.refresh();
  }

  return (
    <form className="loom-form-stack" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("common.title", "Title")}</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>
      <label className="loom-field">
        <span>{t("common.description", "Description")}</span>
        <textarea className="loom-input loom-textarea" {...form.register("description")} />
      </label>
      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("tasks.assignee", "Assignee")}</span>
          <select className="loom-input" {...form.register("assignedToUserId")}>
            <option value="">{t("tasks.unassigned", "Unassigned")}</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="loom-field">
          <span>{t("chores.points", "Points")}</span>
          <input className="loom-input" type="number" min={0} {...form.register("points", { valueAsNumber: true })} />
        </label>
      </div>
      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("tasks.due", "Due")} {t("common.date", "date").toLowerCase()}</span>
          <input className="loom-input" type="date" {...form.register("dueDate")} />
        </label>
        <label className="loom-field">
          <span>{t("tasks.status", "Status")}</span>
          <select className="loom-input" {...form.register("status")}>
            <option value="todo">{t("tasks.statusTodo", "To do")}</option>
            <option value="done">{t("tasks.statusDone", "Done")}</option>
          </select>
        </label>
      </div>
      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("common.saving", "Saving...") : submitLabel}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
