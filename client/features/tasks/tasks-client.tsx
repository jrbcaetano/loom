"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { VisibilityBadge } from "@/components/common/visibility-badge";

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

async function fetchTasks(familyId: string, mineOnly: boolean, status: string, priority: string) {
  const params = new URLSearchParams({ familyId, mine: mineOnly ? "1" : "0", status, priority });
  const response = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json()) as { tasks: TaskRow[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load tasks");
  }

  return payload.tasks;
}

export function TasksClient({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const [mineOnly, setMineOnly] = useState(false);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const queryKey = ["tasks", familyId, mineOnly, status, priority] as const;

  const { data, isPending, error } = useQuery({
    queryKey,
    queryFn: () => fetchTasks(familyId, mineOnly, status, priority)
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
        throw new Error(payload.error ?? "Failed to update task");
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

  return (
    <div className="loom-stack">
      <div className="loom-form-inline">
        <label className="loom-checkbox-row">
          <input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} />
          <span>My tasks only</span>
        </label>

        <select className="loom-input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>

        <select className="loom-input" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {isPending ? <p className="loom-muted">Loading tasks...</p> : null}
      {error ? <p className="loom-feedback-error">{error.message}</p> : null}

      <div className="loom-stack-sm">
        {(data ?? []).map((task) => (
          <article key={task.id} className="loom-card p-4">
            <div className="loom-row-between">
              <div>
                <Link href={`/tasks/${task.id}`} className="loom-link-strong">
                  {task.title}
                </Link>
                <p className="loom-muted small mt-1">{task.description ?? "No description"}</p>
              </div>
              <VisibilityBadge visibility={task.visibility} />
            </div>

            <div className="loom-row-between mt-3">
              <p className="loom-muted small">
                {task.priority.toUpperCase()}{" "}
                {task.startAt || task.dueAt
                  ? `- ${task.startAt ? new Date(task.startAt).toLocaleString() : "No start"} to ${task.dueAt ? new Date(task.dueAt).toLocaleString() : "No due"}`
                  : ""}
              </p>
              <button
                className="loom-button-ghost"
                type="button"
                onClick={() =>
                  updateMutation.mutate({
                    taskId: task.id,
                    body: {
                      status: task.status === "done" ? "todo" : "done"
                    }
                  })
                }
              >
                {task.status === "done" ? "Reopen" : "Complete"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
