"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

export function TaskForm({
  familyId,
  members,
  endpoint,
  method,
  submitLabel,
  initialValues,
  redirectTo
}: {
  familyId: string;
  members: MemberOption[];
  endpoint: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string;
  initialValues?: Partial<TaskValues>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status ?? "todo",
      priority: initialValues?.priority ?? "medium",
      startAt: initialValues?.startAt ?? "",
      dueAt: initialValues?.dueAt ?? "",
      assignedToUserId: initialValues?.assignedToUserId ?? "",
      visibility: initialValues?.visibility ?? "family"
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
      setServerError(payload?.error ?? "Failed to save task");
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
        <span>Title</span>
        <input className="loom-input" type="text" {...form.register("title")} />
      </label>

      <label className="loom-field">
        <span>Description</span>
        <textarea className="loom-input loom-textarea" {...form.register("description")} />
      </label>

      <div className="loom-form-inline">
        <label className="loom-field">
          <span>Status</span>
          <select className="loom-input" {...form.register("status")}>
            <option value="todo">To do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </label>

        <label className="loom-field">
          <span>Priority</span>
          <select className="loom-input" {...form.register("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      <div className="loom-form-inline">
        <label className="loom-field">
          <span>Start date</span>
          <input className="loom-input" type="datetime-local" {...form.register("startAt")} />
        </label>

        <label className="loom-field">
          <span>Due date</span>
          <input className="loom-input" type="datetime-local" {...form.register("dueAt")} />
        </label>

        <label className="loom-field">
          <span>Assignee</span>
          <select className="loom-input" {...form.register("assignedToUserId")}>
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="loom-field">
        <span>Visibility</span>
        <select className="loom-input" {...form.register("visibility")}>
          <option value="private">Private</option>
          <option value="family">Family</option>
          <option value="selected_members">Selected members</option>
        </select>
      </label>

      {visibility === "selected_members" ? (
        <div className="loom-card soft p-4">
          <p className="m-0 font-semibold">Select members</p>
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

      <button className="loom-button-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : submitLabel}
      </button>

      {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
    </form>
  );
}
