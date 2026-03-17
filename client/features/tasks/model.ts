export const TASK_STATUSES = ["inbox", "planned", "in_progress", "waiting", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_LABEL_SCOPES = ["personal", "family"] as const;
export type TaskLabelScope = (typeof TASK_LABEL_SCOPES)[number];

export function normalizeTaskStatus(status: string): TaskStatus {
  if (status === "todo") return "inbox";
  if (status === "next") return "planned";
  if (status === "doing") return "in_progress";
  if (TASK_STATUSES.includes(status as TaskStatus)) {
    return status as TaskStatus;
  }
  return "inbox";
}
