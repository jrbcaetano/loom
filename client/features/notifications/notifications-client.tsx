"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

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

function isTodayIso(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function iconForType(type: NotificationRow["type"]) {
  if (type === "task_assigned") return "☑";
  if (type === "event_created") return "◫";
  if (type === "list_shared") return "☰";
  return "⚠";
}

export function NotificationsClient() {
  const { t, dateLocale } = useI18n();
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
        throw new Error(payload.error ?? t("notifications.updateOneError", "Failed to update notification"));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? t("notifications.updateAllError", "Failed to update notifications"));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const unreadCount = (data ?? []).filter((item) => !item.isRead).length;
  const todayItems = useMemo(() => (data ?? []).filter((item) => isTodayIso(item.createdAt)), [data]);
  const earlierItems = useMemo(() => (data ?? []).filter((item) => !isTodayIso(item.createdAt)), [data]);

  return (
    <div className="loom-stack">
      <section className="loom-row-between">
        {unreadCount > 0 ? <p className="loom-home-pill">{unreadCount} {t("notifications.new", "new")}</p> : <span />}
        <button type="button" className="loom-plain-button" onClick={() => markAll.mutate()}>
          {t("notifications.markAllRead", "Mark all as read")}
        </button>
      </section>

      {isPending ? <p className="loom-muted">{t("notifications.loading", "Loading notifications...")}</p> : null}
      {error ? <p className="loom-feedback-error">{error.message}</p> : null}

      <section>
        <p className="loom-lists-group-title">{t("calendar.today", "Today")}</p>
        <div className="loom-stack-sm mt-2">
          {todayItems.map((notification) => (
            <article key={notification.id} className={`loom-card p-4 ${notification.isRead ? "" : "soft"}`}>
              <div className="loom-row-between">
                <div className="loom-inline-actions">
                  <span className="loom-nav-dot">{iconForType(notification.type)}</span>
                  <p className="m-0 font-semibold">{notification.title}</p>
                </div>
                {!notification.isRead ? <span className="loom-calendar-dot is-family" /> : null}
              </div>
              {notification.body ? <p className="loom-muted small mt-2">{notification.body}</p> : null}
              <div className="loom-row-between mt-3">
                <p className="loom-muted small m-0">{new Date(notification.createdAt).toLocaleString(dateLocale)}</p>
                {!notification.isRead ? (
                  <button type="button" className="loom-plain-button" onClick={() => markOne.mutate(notification.id)}>
                    {t("notifications.markRead", "Mark read")}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {todayItems.length === 0 ? <p className="loom-muted">{t("notifications.noneToday", "No notifications today.")}</p> : null}
        </div>
      </section>

      <section>
        <p className="loom-lists-group-title">{t("notifications.earlier", "Earlier")}</p>
        <div className="loom-stack-sm mt-2">
          {earlierItems.map((notification) => (
            <article key={notification.id} className="loom-card p-4">
              <div className="loom-inline-actions">
                <span className="loom-nav-dot">{iconForType(notification.type)}</span>
                <p className="m-0 font-semibold">{notification.title}</p>
              </div>
              {notification.body ? <p className="loom-muted small mt-2">{notification.body}</p> : null}
              <p className="loom-muted small mt-3 m-0">{new Date(notification.createdAt).toLocaleString(dateLocale)}</p>
            </article>
          ))}
          {earlierItems.length === 0 ? <p className="loom-muted">{t("notifications.noneEarlier", "No earlier notifications.")}</p> : null}
        </div>
      </section>
    </div>
  );
}
