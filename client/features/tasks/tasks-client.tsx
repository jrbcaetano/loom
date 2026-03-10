"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  startAt: string | null;
  dueAt: string | null;
  assignedToUserId: string | null;
  visibility: "private" | "family" | "selected_members";
};

type AssigneeOption = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
};

async function fetchTasks(familyId: string, mineOnly: boolean) {
  const params = new URLSearchParams({ familyId, mine: mineOnly ? "1" : "0", status: "all", priority: "all" });
  const response = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as { tasks: TaskRow[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load tasks");
  }

  return payload.tasks;
}

function priorityColor(priority: TaskRow["priority"]) {
  if (priority === "high") return "#EF4444";
  if (priority === "medium") return "#F59E0B";
  return "#6B7280";
}

function formatDue(task: TaskRow, t: (key: string, fallback?: string) => string, locale: string) {
  if (!task.dueAt) return t("tasks.noDueDate", "No due date");
  const due = new Date(task.dueAt);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);

  if (due >= today && due < tomorrow) return t("calendar.today", "Today");
  if (due >= tomorrow && due < dayAfter) return t("calendar.tomorrow", "Tomorrow");
  return due.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US");
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function TasksClient({ familyId, assignees }: { familyId: string; assignees: AssigneeOption[] }) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [mineOnly, setMineOnly] = useState(false);
  const [view, setView] = useState<"all" | "active" | "completed">("all");
  const assigneeMap = useMemo(() => new Map(assignees.map((assignee) => [assignee.userId, assignee])), [assignees]);

  const queryKey = ["tasks", familyId, mineOnly] as const;

  const { data, isPending, error } = useQuery({
    queryKey,
    queryFn: () => fetchTasks(familyId, mineOnly)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: Record<string, unknown> }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? t("tasks.updateError", "Failed to update task"));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", familyId] });
    }
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tasks-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `family_id=eq.${familyId}`
        },
        () => queryClient.invalidateQueries({ queryKey: ["tasks", familyId] })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, queryClient]);

  const allTasks = data ?? [];
  const activeTasks = allTasks.filter((task) => task.status !== "done");
  const completedTasks = allTasks.filter((task) => task.status === "done");

  const visibleTasks = useMemo(() => {
    if (view === "active") return activeTasks;
    if (view === "completed") return completedTasks;
    return allTasks;
  }, [view, activeTasks, completedTasks, allTasks]);

  function renderAssignee(assignedToUserId: string | null) {
    if (!assignedToUserId) {
      return <span className="loom-task-assignee-name is-unassigned">{t("tasks.unassigned", "Unassigned")}</span>;
    }

    const assignee = assigneeMap.get(assignedToUserId);
    const displayName = assignee?.displayName ?? t("common.unknown", "Unknown");
    const hasAvatar = Boolean(assignee?.avatarUrl);

    return (
      <span className="loom-task-assignee">
        <span
          className={`loom-task-assignee-avatar ${hasAvatar ? "has-image" : ""}`}
          style={hasAvatar ? { backgroundImage: `url("${assignee?.avatarUrl}")` } : undefined}
          aria-hidden="true"
        >
          {hasAvatar ? null : getInitials(displayName)}
        </span>
        <span className="loom-task-assignee-name">{displayName}</span>
      </span>
    );
  }

  function renderVisibilityPill(visibility: TaskRow["visibility"]) {
    const label = visibility === "selected_members" ? t("visibility.selected_members", "Selected members") : t(`visibility.${visibility}`, visibility);
    return <span className={`loom-home-pill ${visibility === "family" ? "" : "is-muted"}`}>{label}</span>;
  }

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <div className="loom-inline-actions">
            <button className={`loom-task-tab ${view === "all" ? "is-active" : ""}`} type="button" onClick={() => setView("all")}>
              {t("tasks.filterAll", "All")} {allTasks.length}
            </button>
            <button className={`loom-task-tab ${view === "active" ? "is-active" : ""}`} type="button" onClick={() => setView("active")}>
              {t("tasks.filterActive", "Active")} {activeTasks.length}
            </button>
            <button className={`loom-task-tab ${view === "completed" ? "is-active" : ""}`} type="button" onClick={() => setView("completed")}>
              {t("tasks.filterCompleted", "Completed")} {completedTasks.length}
            </button>
          </div>

          <label className="loom-checkbox-row">
            <input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} />
            <span>{t("tasks.mine", "Mine")}</span>
          </label>
        </div>
      </section>

      {isPending ? <p className="loom-muted">{t("tasks.loading", "Loading tasks...")}</p> : null}
      {error ? <p className="loom-feedback-error">{error.message}</p> : null}

      {view === "all" ? (
        <>
          <section className="loom-card">
            <div className="loom-task-list">
              {activeTasks.length === 0 ? <p className="loom-muted p-4">{t("tasks.noActive", "No active tasks.")}</p> : null}
              {activeTasks.map((task) => (
                <article key={task.id} className="loom-task-item">
                  <button
                    className={`loom-home-checkbox ${task.status === "done" ? "is-done" : ""}`}
                    type="button"
                    aria-label={task.status === "done" ? t("tasks.markActive", "Mark task as active") : t("tasks.markComplete", "Mark task as complete")}
                    onClick={() =>
                      updateMutation.mutate({
                        taskId: task.id,
                        body: {
                          status: task.status === "done" ? "todo" : "done"
                        }
                      })
                    }
                  />

                  <div className="loom-task-main">
                    <Link href={`/tasks/${task.id}`} className="loom-task-title">
                      {task.title}
                    </Link>
                    <p className="loom-task-meta">
                      {formatDue(task, t, locale)} - <span style={{ color: priorityColor(task.priority) }}>{task.priority}</span>
                    </p>
                  </div>

                  <div className="loom-task-right">
                    {renderAssignee(task.assignedToUserId)}
                    {renderVisibilityPill(task.visibility)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {completedTasks.length > 0 ? (
            <section className="loom-card">
              <div className="loom-task-list">
                {completedTasks.map((task) => (
                  <article key={task.id} className="loom-task-item">
                    <button
                      className={`loom-home-checkbox ${task.status === "done" ? "is-done" : ""}`}
                      type="button"
                      aria-label={t("tasks.markActive", "Mark task as active")}
                      onClick={() =>
                        updateMutation.mutate({
                          taskId: task.id,
                          body: {
                            status: "todo"
                          }
                        })
                      }
                    />

                    <div className="loom-task-main">
                      <Link href={`/tasks/${task.id}`} className="loom-task-title loom-home-line-through">
                        {task.title}
                      </Link>
                      <p className="loom-task-meta">{t("tasks.filterCompleted", "Completed")}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="loom-card">
          <div className="loom-task-list">
            {visibleTasks.length === 0 ? <p className="loom-muted p-4">{t("tasks.noneFound", "No tasks found.")}</p> : null}
            {visibleTasks.map((task) => (
              <article key={task.id} className="loom-task-item">
                <button
                  className={`loom-home-checkbox ${task.status === "done" ? "is-done" : ""}`}
                  type="button"
                  aria-label={task.status === "done" ? t("tasks.markActive", "Mark task as active") : t("tasks.markComplete", "Mark task as complete")}
                  onClick={() =>
                    updateMutation.mutate({
                      taskId: task.id,
                      body: {
                        status: task.status === "done" ? "todo" : "done"
                      }
                    })
                  }
                />

                <div className="loom-task-main">
                  <Link href={`/tasks/${task.id}`} className={`loom-task-title ${task.status === "done" ? "loom-home-line-through" : ""}`}>
                    {task.title}
                  </Link>
                  <p className="loom-task-meta">
                    {formatDue(task, t, locale)} - <span style={{ color: priorityColor(task.priority) }}>{task.priority}</span>
                  </p>
                </div>

                <div className="loom-task-right">
                  {renderAssignee(task.assignedToUserId)}
                  {renderVisibilityPill(task.visibility)}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}