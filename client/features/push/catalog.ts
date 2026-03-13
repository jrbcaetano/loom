export const PUSH_EVENT_CATALOG = [
  { key: "new_message", labelKey: "admin.pushEvents.newMessage", fallbackLabel: "New message" },
  { key: "task_assigned", labelKey: "admin.pushEvents.taskAssigned", fallbackLabel: "Task assigned" },
  { key: "list_shared", labelKey: "admin.pushEvents.listShared", fallbackLabel: "List shared" },
  { key: "event_created", labelKey: "admin.pushEvents.eventCreated", fallbackLabel: "Event created" },
  { key: "general_notification", labelKey: "admin.pushEvents.generalNotification", fallbackLabel: "General notification" }
] as const;

export type PushEventKey = (typeof PUSH_EVENT_CATALOG)[number]["key"];
