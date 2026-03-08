"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type NotificationRow = {
  id: string;
  type: "task_assigned" | "list_shared" | "event_created" | "general";
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
};

async function fetchNotifications() {
  const response = await fetch("/api/notifications", { cache: "no-store" });
  const payload = (await response.json()) as { notifications: NotificationRow[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load notifications");
  }

  return payload.notifications;
}

export function NotificationsClient() {
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update notification");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update notifications");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <h2 className="loom-section-title">Notification center</h2>
        <button type="button" className="loom-button-ghost" onClick={() => markAll.mutate()}>
          Mark all as read
        </button>
      </div>

      {isPending ? <p className="loom-muted">Loading notifications...</p> : null}
      {error ? <p className="loom-feedback-error">{error.message}</p> : null}

      <div className="loom-stack-sm">
        {(data ?? []).map((notification) => (
          <article key={notification.id} className={`loom-card p-4 ${notification.isRead ? "is-read" : ""}`}>
            <div className="loom-row-between">
              <p className="m-0 font-semibold">{notification.title}</p>
              <p className="loom-muted small">{new Date(notification.createdAt).toLocaleString()}</p>
            </div>
            {notification.body ? <p className="loom-muted mt-2">{notification.body}</p> : null}
            {!notification.isRead ? (
              <button type="button" className="loom-button-ghost mt-3" onClick={() => markOne.mutate(notification.id)}>
                Mark as read
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
