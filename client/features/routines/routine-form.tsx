"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const routineFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  assignedToUserId: z.string().optional(),
  scheduleType: z.enum(["daily", "weekly", "custom"]),
  steps: z.array(z.object({ text: z.string().trim().min(1).max(240) }))
});

type RoutineFormValues = z.infer<typeof routineFormSchema>;
type MemberOption = { userId: string; displayName: string };

export function RoutineForm({
  familyId,
  members,
  endpoint,
  method,
  submitLabel,
  redirectTo,
  initialValues,
  disableRedirect = false,
  onSaved
}: {
  familyId: string;
  members: MemberOption[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: Partial<RoutineFormValues>;
  disableRedirect?: boolean;
  onSaved?: (payload: { routineId?: string }) => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RoutineFormValues>({
    resolver: zodResolver(routineFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      assignedToUserId: initialValues?.assignedToUserId ?? "",
      scheduleType: initialValues?.scheduleType ?? "daily",
      steps: initialValues?.steps && initialValues.steps.length > 0 ? initialValues.steps : [{ text: "" }]
    }
  });

  const steps = useFieldArray({ control: form.control, name: "steps" });

  async function onSubmit(values: RoutineFormValues) {
    setServerError(null);
    setIsLoading(true);

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        assignedToUserId: values.assignedToUserId || null,
        scheduleType: values.scheduleType,
        steps: values.steps.map((step) => step.text).filter((step) => step.trim().length > 0)
      })
    });

    const payload = (await response.json().catch(() => null)) as { routineId?: string; error?: string } | null;
    if (!response.ok) {
      setServerError(payload?.error ?? t("routines.saveError", "Failed to save routine"));
      setIsLoading(false);
      return;
    }

    onSaved?.({ routineId: payload?.routineId });

    if (disableRedirect) {
      setIsLoading(false);
      return;
    }

    const next = payload?.routineId ? `/routines/${payload.routineId}` : redirectTo;
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
          <span>{t("routines.schedule", "Schedule")}</span>
          <select className="loom-input" {...form.register("scheduleType")}>
            <option value="daily">{t("routines.daily", "Daily")}</option>
            <option value="weekly">{t("routines.weekly", "Weekly")}</option>
            <option value="custom">{t("routines.custom", "Custom")}</option>
          </select>
        </label>
      </div>
      <div className="loom-stack-sm">
        <div className="loom-row-between">
          <h3 className="loom-section-title">{t("routines.checklistSteps", "Checklist steps")}</h3>
          <button type="button" className="loom-button-ghost" onClick={() => steps.append({ text: "" })}>
            {t("routines.addStep", "Add step")}
          </button>
        </div>
        {steps.fields.map((field, index) => (
          <div key={field.id} className="loom-row-between">
            <input className="loom-input" type="text" {...form.register(`steps.${index}.text`)} />
            {steps.fields.length > 1 ? (
              <button type="button" className="loom-button-ghost" onClick={() => steps.remove(index)}>
                {t("common.remove", "Remove")}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? t("common.saving", "Saving...") : submitLabel}
      </button>
      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
