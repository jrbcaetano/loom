"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["todo", "doing", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  startAt: z.string().optional(),
  dueAt: z.string().optional(),
  assignedToUserId: z.string().optional(),
  visibility: z.enum(["private", "family", "selected_members"])
}).refine((value) => {
  if (!value.startAt || !value.dueAt) {
    return true;
  }
  return new Date(value.dueAt).getTime() >= new Date(value.startAt).getTime();
}, {
  path: ["dueAt"],
  message: "Due date must be after or equal to start date"
});

type TaskValues = z.infer<typeof taskSchema>;

type MemberOption = {
  userId: string;
  displayName: string;
};

function toLocalDateTimeValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultStartAt() {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return toLocalDateTimeValue(start);
}

function getDefaultDueAt() {
  const due = new Date();
  due.setHours(23, 59, 0, 0);
  return toLocalDateTimeValue(due);
}

export function TaskForm({
  familyId,
  members,
  endpoint,
  method,
  submitLabel,
  initialValues,
  defaultAssigneeUserId,
  cancelHref,
  redirectTo
}: {
  familyId: string;
  members: MemberOption[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: Partial<TaskValues>;
  defaultAssigneeUserId?: string;
  cancelHref?: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status ?? "todo",
      priority: initialValues?.priority ?? "medium",
      startAt: initialValues?.startAt ?? getDefaultStartAt(),
      dueAt: initialValues?.dueAt ?? getDefaultDueAt(),
      assignedToUserId: initialValues?.assignedToUserId ?? defaultAssigneeUserId ?? "",
      visibility: initialValues?.visibility ?? "private"
    }
  });

  const visibility = form.watch("visibility");

  async function onSubmit(values: TaskValues) {
    setServerError(null);
    setIsLoading(true);

    const selectedMemberIds =
      visibility === "selected_members"
        ? Array.from(document.querySelectorAll<HTMLInputElement>('input[name="selectedMembers"]:checked')).map((input) => input.value)
        : [];

    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        familyId,
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        startAt: values.startAt ? new Date(values.startAt).toISOString() : null,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        assignedToUserId: values.assignedToUserId || null,
        visibility: values.visibility,
        selectedMemberIds
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; taskId?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("tasks.saveError", "Failed to save task"));
      setIsLoading(false);
      return;
    }

    const destination = payload?.taskId ? `/tasks/${payload.taskId}` : redirectTo;
    router.push(destination);
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
          <span>{t("tasks.status", "Status")}</span>
          <select className="loom-input" {...form.register("status")}>
            <option value="todo">{t("tasks.statusTodo", "To do")}</option>
            <option value="doing">{t("tasks.statusDoing", "Doing")}</option>
            <option value="done">{t("tasks.statusDone", "Done")}</option>
          </select>
        </label>

        <label className="loom-field">
          <span>{t("tasks.priority", "Priority")}</span>
          <select className="loom-input" {...form.register("priority")}>
            <option value="low">{t("tasks.priorityLow", "Low")}</option>
            <option value="medium">{t("tasks.priorityMedium", "Medium")}</option>
            <option value="high">{t("tasks.priorityHigh", "High")}</option>
          </select>
        </label>
      </div>

      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("tasks.startDate", "Start date")}</span>
          <input className="loom-input" type="datetime-local" {...form.register("startAt")} />
        </label>

        <label className="loom-field">
          <span>{t("tasks.dueDate", "Due date")}</span>
          <input className="loom-input" type="datetime-local" {...form.register("dueAt")} />
        </label>

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
      </div>

      <label className="loom-field">
        <span>{t("common.visibility", "Visibility")}</span>
        <select className="loom-input" {...form.register("visibility")}>
          <option value="private">{t("visibility.private", "Private")}</option>
          <option value="family">{t("visibility.family", "Family")}</option>
          <option value="selected_members">{t("visibility.selected_members", "Selected members")}</option>
        </select>
      </label>

      {visibility === "selected_members" ? (
        <div className="loom-card soft p-4">
          <p className="m-0 font-semibold">{t("common.selectMembers", "Select members")}</p>
          <div className="loom-stack-sm mt-3">
            {members.map((member) => (
              <label key={member.userId} className="loom-checkbox-row">
                <input type="checkbox" name="selectedMembers" value={member.userId} />
                <span>{member.displayName}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="loom-form-actions">
        {cancelHref ? (
          <Link href={cancelHref} className="loom-button-ghost">
            {t("common.cancel", "Cancel")}
          </Link>
        ) : null}

        <button className="loom-button-primary" type="submit" disabled={isLoading}>
          {isLoading ? t("common.saving", "Saving...") : submitLabel}
        </button>
      </div>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
