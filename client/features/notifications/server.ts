import { createClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: "task_assigned" | "list_shared" | "event_created" | "general";
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  relatedEntityType: "list" | "task" | "event" | null;
  relatedEntityId: string | null;
};

export async function getNotifications(limit = 100): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at, related_entity_type, related_entity_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id
  }));
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (error) {
    throw new Error(error.message);
  }
}
