"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/context";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/features/tasks/model";

const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    startAt: z.string().optional(),
    dueAt: z.string().optional(),
    assignedToUserId: z.string().optional(),
    visibility: z.enum(["private", "family", "selected_members"]),
    labelIds: z.array(z.string().uuid()).default([])
  })
  .refine(
    (value) => {
      if (!value.startAt || !value.dueAt) {
        return true;
      }
      return new Date(value.dueAt).getTime() >= new Date(value.startAt).getTime();
    },
    {
      path: ["dueAt"],
      message: "Due date must be after or equal to start date"
    }
  );

type TaskValuesInput = z.input<typeof taskSchema>;
type TaskValues = z.output<typeof taskSchema>;

type MemberOption = {
  userId: string;
  displayName: string;
};

type LabelOption = {
  id: string;
  name: string;
  color: string;
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
  redirectTo,
  personalLabels,
  familyLabels,
  disableRedirect = false,
  onSaved,
  mode = "default"
}: {
  familyId: string;
  members: MemberOption[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: Partial<TaskValuesInput>;
  defaultAssigneeUserId?: string;
  cancelHref?: string;
  personalLabels: LabelOption[];
  familyLabels: LabelOption[];
  disableRedirect?: boolean;
  onSaved?: (payload: { taskId?: string }) => void;
  mode?: "default" | "drawer";
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const form = useForm<TaskValuesInput, unknown, TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status ?? "inbox",
      priority: initialValues?.priority ?? "medium",
      startAt: initialValues?.startAt ?? getDefaultStartAt(),
      dueAt: initialValues?.dueAt ?? getDefaultDueAt(),
      assignedToUserId: initialValues?.assignedToUserId ?? defaultAssigneeUserId ?? "",
      visibility: initialValues?.visibility ?? "private",
      labelIds: initialValues?.labelIds ?? []
    }
  });

  const visibility = form.watch("visibility");
  const selectedLabelIds = form.watch("labelIds") ?? [];

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
        selectedMemberIds,
        labelIds: values.labelIds ?? []
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; taskId?: string } | null;

    if (!response.ok) {
      setServerError(payload?.error ?? t("tasks.saveError", "Failed to save task"));
      setIsLoading(false);
      return;
    }

    onSaved?.({ taskId: payload?.taskId });

    if (disableRedirect) {
      setIsLoading(false);
      return;
    }

    const destination = payload?.taskId ? `/tasks/${payload.taskId}` : redirectTo;
    router.push(destination);
    router.refresh();
  }

  function toggleLabel(labelId: string) {
    const current = new Set(selectedLabelIds);
    if (current.has(labelId)) {
      current.delete(labelId);
    } else {
      current.add(labelId);
    }
    form.setValue("labelIds", Array.from(current));
  }

  return (
    <form className={`loom-form-stack loom-task-form ${mode === "drawer" ? "is-drawer" : ""}`.trim()} onSubmit={form.handleSubmit(onSubmit)}>
      <label className="loom-field">
        <span>{t("common.title", "Title")}</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>

      <label className="loom-field">
        <span>{t("common.description", "Description")}</span>
        <textarea className={`loom-input loom-textarea ${mode === "drawer" ? "loom-task-description-large" : ""}`.trim()} {...form.register("description")} />
      </label>

      <div className="loom-form-inline">
        <label className="loom-field">
          <span>{t("tasks.status", "Status")}</span>
          <select className="loom-input" {...form.register("status")}>
            <option value="inbox">{t("tasks.statusInbox", "Inbox")}</option>
            <option value="planned">{t("tasks.statusPlanned", "Planned")}</option>
            <option value="in_progress">{t("tasks.statusInProgress", "In progress")}</option>
            <option value="waiting">{t("tasks.statusWaiting", "Waiting")}</option>
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

      <div className="loom-form-inline loom-task-form-schedule-row">
        <label className="loom-field">
          <span>{t("tasks.startDate", "Start date")}</span>
          <input className="loom-input" type="datetime-local" {...form.register("startAt")} />
        </label>

        <label className="loom-field">
          <span>{t("tasks.dueDate", "Due date")}</span>
          <input className="loom-input" type="datetime-local" {...form.register("dueAt")} />
        </label>

      </div>

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

      <div className="loom-card soft p-4">
        <p className="m-0 font-semibold">{t("tasks.labels", "Labels")}</p>
        <p className="loom-muted small mt-2 mb-0">{t("tasks.labelsHint", "Pick personal and family labels to organize this task.")}</p>

        <div className="loom-stack-sm mt-3">
          {personalLabels.length > 0 ? <p className="loom-muted small m-0">{t("tasks.personalLabels", "Personal labels")}</p> : null}
          <div className="loom-label-list">
            {personalLabels.map((label) => {
              const checked = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  className={`loom-task-label-chip ${checked ? "is-selected" : ""}`}
                  onClick={() => toggleLabel(label.id)}
                  style={{ borderColor: label.color }}
                >
                  <i style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              );
            })}
          </div>

          {familyLabels.length > 0 ? <p className="loom-muted small m-0">{t("tasks.familyLabels", "Family labels")}</p> : null}
          <div className="loom-label-list">
            {familyLabels.map((label) => {
              const checked = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  className={`loom-task-label-chip ${checked ? "is-selected" : ""}`}
                  onClick={() => toggleLabel(label.id)}
                  style={{ borderColor: label.color }}
                >
                  <i style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              );
            })}
          </div>

          {personalLabels.length === 0 && familyLabels.length === 0 ? (
            <p className="loom-muted small m-0">{t("tasks.noLabelsConfigured", "No labels configured yet. Add them in Settings or Family Settings.")}</p>
          ) : null}
        </div>
      </div>

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

