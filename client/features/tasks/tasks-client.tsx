"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { resolveDateFnsLocale } from "@/lib/date";
import type { TaskStatus } from "@/features/tasks/model";
import { ResponsivePanel } from "@/components/common/responsive-panel";

type TaskLabel = {
  id: string;
  name: string;
  color: string;
  scope: "personal" | "family";
  userId: string | null;
  familyId: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  startAt: string | null;
  dueAt: string | null;
  assignedToUserId: string | null;
  ownerUserId: string;
  visibility: "private" | "family" | "selected_members";
  familyId: string;
  createdAt: string;
  updatedAt: string;
  labels: TaskLabel[];
  selectedMemberIds: string[];
};

type TaskCommentRow = {
  id: string;
  taskId: string;
  familyId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

type DrawerDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  startAtLocal: string;
  dueAtLocal: string;
  assignedToUserId: string;
  visibility: "private" | "family" | "selected_members";
  labelIds: string[];
  selectedMemberIds: string[];
};

type AssigneeOption = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
};

type VisibilityMode = "my" | "family";
type DisplayMode = "list" | "board" | "calendar";
type DensityMode = "comfortable" | "compact" | "spacious";
type SmartView = "inbox" | "today" | "this_week" | "planned" | "all" | "completed";
type LabelMatchMode = "or" | "and";
type DateFilter = "all" | "today" | "overdue" | "next7" | "no_date";
type SortBy = "none" | "date" | "date_added" | "priority";
type CalendarTaskView = "due" | "duration";
type CalendarTaskColorBy = "label" | "status" | "priority" | "due_proximity" | "visibility";
type TasksUiPreferences = {
  visibilityMode?: VisibilityMode;
  smartView?: SmartView;
  selectedLabelIds?: string[];
  labelMatchMode?: LabelMatchMode;
  displayMode?: DisplayMode;
  densityMode?: DensityMode;
  boardExpanded?: boolean;
  calendarTaskView?: CalendarTaskView;
  calendarTaskColorBy?: CalendarTaskColorBy;
};

type CalendarTaskSegment = {
  task: TaskRow;
  isStart: boolean;
  isEnd: boolean;
};

type CalendarTaskLaneSegment = CalendarTaskSegment & {
  lane: number;
};

type CalendarTaskHoverCard = {
  taskId: string;
  left: number;
  top: number;
};

type CalendarOverflowCard = {
  dayKey: string;
  taskIds: string[];
  left: number;
  top: number;
};

type QuickShortcutTrigger = "#" | "@" | "/";

type QuickShortcutSession = {
  trigger: QuickShortcutTrigger;
  query: string;
  start: number;
  end: number;
  caret: number;
};

type QuickShortcutAction =
  | { type: "label"; labelId: string }
  | { type: "assignee"; userId: string }
  | { type: "due_date"; dueAtLocal: string }
  | { type: "priority"; priority: "low" | "medium" | "high" };

type QuickShortcutOption = {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  selected: boolean;
  color?: string;
  action: QuickShortcutAction;
};

type QuickShortcutAnchor = {
  left: number;
  top: number;
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

async function fetchTaskComments(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}/comments`, { cache: "no-store" });
  const payload = (await response.json()) as { comments: TaskCommentRow[]; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load comments");
  }

  return payload.comments;
}

function statusLabel(status: TaskStatus, t: (key: string, fallback?: string) => string) {
  if (status === "inbox") return t("tasks.statusInbox", "Inbox");
  if (status === "planned") return t("tasks.statusPlanned", "Planned");
  if (status === "in_progress") return t("tasks.statusInProgress", "In progress");
  if (status === "waiting") return t("tasks.statusWaiting", "Waiting");
  return t("tasks.statusDone", "Done");
}

function priorityWeight(priority: TaskRow["priority"]) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function priorityColor(priority: TaskRow["priority"]) {
  if (priority === "high") return "#EF4444";
  if (priority === "medium") return "#F59E0B";
  return "#6B7280";
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function dueDateOnly(task: TaskRow) {
  if (!task.dueAt) return null;
  const due = new Date(task.dueAt);
  return new Date(due.getFullYear(), due.getMonth(), due.getDate());
}

function startDateOnly(task: TaskRow) {
  if (!task.startAt) return null;
  const start = new Date(task.startAt);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate());
}

function compareCalendarDate(left: Date, right: Date) {
  return new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime() - new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime();
}

function isOverdue(task: TaskRow, now: Date) {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  if (!due || task.status === "done") return false;
  return due.getTime() < now.getTime();
}

function boardStatuses(): TaskStatus[] {
  return ["inbox", "planned", "in_progress", "waiting", "done"];
}

function formatDue(task: TaskRow, t: (key: string, fallback?: string) => string, dateLocale: string) {
  if (!task.dueAt) return t("tasks.noDueDate", "No due date");

  const due = new Date(task.dueAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);

  if (due >= today && due < tomorrow) return t("calendar.today", "Today");
  if (due >= tomorrow && due < dayAfter) return t("calendar.tomorrow", "Tomorrow");
  return due.toLocaleDateString(dateLocale);
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function sameLabelSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  for (const value of right) {
    if (!leftSet.has(value)) return false;
  }
  return true;
}

function normalizeServerErrorMessage(value: string) {
  try {
    const parsed = JSON.parse(value) as Array<{ message?: string }> | { message?: string };
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0]?.message === "string") {
      return parsed[0].message;
    }
    if (!Array.isArray(parsed) && typeof parsed?.message === "string") {
      return parsed.message;
    }
  } catch {
    return value;
  }

  return value;
}

function cleanShortcutToken(value: string, session: QuickShortcutSession) {
  const nextValue = `${value.slice(0, session.start)} ${value.slice(session.end)}`;
  return nextValue.replace(/\s+/g, " ").trim();
}

function findQuickShortcutSession(value: string, caret: number) {
  const tokenEnd = value.slice(caret).search(/\s/);
  const sessionEnd = tokenEnd === -1 ? value.length : caret + tokenEnd;
  const beforeCaret = value.slice(0, caret);
  const match = /(^|\s)([#@/])([^\s#@/]*)$/.exec(beforeCaret);

  if (!match) return null;

  const prefix = match[1] ?? "";
  const trigger = match[2] as QuickShortcutTrigger;
  const query = match[3] ?? "";
  const start = (match.index ?? 0) + prefix.length;

  return {
    trigger,
    query,
    start,
    end: sessionEnd,
    caret
  } satisfies QuickShortcutSession;
}

function getInputCaretAnchor(input: HTMLInputElement, caret: number): QuickShortcutAnchor {
  const rect = input.getBoundingClientRect();
  const styles = window.getComputedStyle(input);
  const font = [
    styles.fontStyle,
    styles.fontVariant,
    styles.fontWeight,
    styles.fontSize,
    styles.lineHeight === "normal" ? "" : `/${styles.lineHeight}`,
    styles.fontFamily
  ]
    .filter(Boolean)
    .join(" ");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const paddingLeft = Number.parseFloat(styles.paddingLeft || "0");
  const paddingTop = Number.parseFloat(styles.paddingTop || "0");

  if (context) {
    context.font = font;
  }

  const beforeCaret = input.value.slice(0, caret);
  const textWidth = context?.measureText(beforeCaret).width ?? 0;
  const left = rect.left + paddingLeft + textWidth - input.scrollLeft;
  const top = rect.top + paddingTop + input.offsetHeight / 2;

  return {
    left,
    top
  };
}

function endOfDayLocal(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 0, 0);
  return formatDateTimeLocal(next.toISOString());
}

function upcomingFriday(baseDate: Date, offsetWeeks = 0) {
  const next = new Date(baseDate);
  const day = next.getDay();
  const friday = 5;
  let daysUntilFriday = friday - day;

  if (daysUntilFriday < 0) {
    daysUntilFriday += 7;
  }

  next.setDate(next.getDate() + daysUntilFriday + offsetWeeks * 7);
  next.setHours(23, 59, 0, 0);
  return formatDateTimeLocal(next.toISOString());
}

function extractLabelIdsFromTitle(title: string, labels: TaskLabel[]) {
  const regex = /(^|\s)#([A-Za-z0-9_-]+)/g;
  const matchedIds = new Set<string>();
  let next: RegExpExecArray | null = regex.exec(title);

  while (next) {
    const token = (next[2] ?? "").toLowerCase();
    const exact = labels.find((label) => label.name.toLowerCase() === token);
    if (exact) {
      matchedIds.add(exact.id);
    }
    next = regex.exec(title);
  }

  const cleanedTitle = title.replace(/(^|\s)#[A-Za-z0-9_-]+/g, " ").replace(/\s+/g, " ").trim();
  return {
    cleanedTitle,
    labelIds: Array.from(matchedIds)
  };
}

export function TasksClient({
  familyId,
  currentUserId,
  assignees,
  personalLabels,
  familyLabels,
  initialTasks
}: {
  familyId: string;
  currentUserId: string;
  assignees: AssigneeOption[];
  personalLabels: TaskLabel[];
  familyLabels: TaskLabel[];
  initialTasks?: TaskRow[];
}) {
  const { t, locale, dateLocale } = useI18n();
  const queryClient = useQueryClient();

  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("my");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [densityMode, setDensityMode] = useState<DensityMode>("comfortable");
  const [smartView, setSmartView] = useState<SmartView>("inbox");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [labelMatchMode, setLabelMatchMode] = useState<LabelMatchMode>("or");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [calendarTaskView, setCalendarTaskView] = useState<CalendarTaskView>("due");
  const [calendarTaskColorBy, setCalendarTaskColorBy] = useState<CalendarTaskColorBy>("label");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [calendarHoverCard, setCalendarHoverCard] = useState<CalendarTaskHoverCard | null>(null);
  const [calendarOverflowCard, setCalendarOverflowCard] = useState<CalendarOverflowCard | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickDueAtLocal, setQuickDueAtLocal] = useState("");
  const [quickPriority, setQuickPriority] = useState<"low" | "medium" | "high">("medium");
  const [quickAssignedToUserId, setQuickAssignedToUserId] = useState(currentUserId);
  const [quickLabelIds, setQuickLabelIds] = useState<string[]>([]);
  const [quickShortcutSession, setQuickShortcutSession] = useState<QuickShortcutSession | null>(null);
  const [quickShortcutActiveIndex, setQuickShortcutActiveIndex] = useState(0);
  const [quickShortcutAnchor, setQuickShortcutAnchor] = useState<QuickShortcutAnchor | null>(null);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [commentsSort, setCommentsSort] = useState<"oldest" | "newest">("oldest");
  const [drawerDraft, setDrawerDraft] = useState<DrawerDraft | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [drawerEditor, setDrawerEditor] = useState<null | "status" | "priority" | "startAt" | "dueAt" | "assignee" | "visibility" | "labels">(null);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [drawerSaveError, setDrawerSaveError] = useState<string | null>(null);
  const displayMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const quickTitleInputRef = useRef<HTMLInputElement | null>(null);
  const quickShortcutPaletteRef = useRef<HTMLDivElement | null>(null);
  const calendarHoverHideTimeoutRef = useRef<number | null>(null);
  const calendarOverflowHideTimeoutRef = useRef<number | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const preferencesStorageKey = useMemo(() => `loom.tasks.ui.v1:${currentUserId}:${familyId}`, [currentUserId, familyId]);

  const assigneeMap = useMemo(() => new Map(assignees.map((assignee) => [assignee.userId, assignee])), [assignees]);
  const memberOptions = useMemo(
    () => assignees.map((assignee) => ({ userId: assignee.userId, displayName: assignee.displayName })),
    [assignees]
  );
  const activeLabels = visibilityMode === "my" ? personalLabels : familyLabels;
  const drawerLabelOptions = useMemo(() => [...personalLabels, ...familyLabels], [personalLabels, familyLabels]);
  const quickAddLabelOptions = activeLabels;
  const quickAssignee = useMemo(
    () => assignees.find((assignee) => assignee.userId === quickAssignedToUserId) ?? null,
    [assignees, quickAssignedToUserId]
  );

  useEffect(() => {
    setSelectedLabelIds((current) => current.filter((labelId) => activeLabels.some((label) => label.id === labelId)));
  }, [activeLabels]);

  useEffect(() => {
    if (visibilityMode !== "family" && calendarTaskColorBy === "visibility") {
      setCalendarTaskColorBy("label");
    }
  }, [calendarTaskColorBy, visibilityMode]);

  useEffect(() => {
    setQuickLabelIds((current) => current.filter((labelId) => quickAddLabelOptions.some((label) => label.id === labelId)));
  }, [quickAddLabelOptions]);

  const quickShortcutOptions = useMemo(() => {
    if (!quickShortcutSession) return [] as QuickShortcutOption[];

    const normalizedQuery = quickShortcutSession.query.trim().toLowerCase();

    if (quickShortcutSession.trigger === "#") {
      return quickAddLabelOptions
        .filter((label) => (normalizedQuery.length === 0 ? true : label.name.toLowerCase().includes(normalizedQuery)))
        .map<QuickShortcutOption>((label) => ({
          id: `label:${label.id}`,
          title: label.name,
          group: t("tasks.labels", "Labels"),
          selected: quickLabelIds.includes(label.id),
          color: label.color,
          action: { type: "label", labelId: label.id }
        }))
        .slice(0, 8);
    }

    if (quickShortcutSession.trigger === "@") {
      return assignees
        .filter((assignee) => (normalizedQuery.length === 0 ? true : assignee.displayName.toLowerCase().includes(normalizedQuery)))
        .map<QuickShortcutOption>((assignee) => ({
          id: `assignee:${assignee.userId}`,
          title: assignee.displayName,
          group: t("tasks.assignees", "Assignees"),
          selected: quickAssignedToUserId === assignee.userId,
          action: { type: "assignee", userId: assignee.userId }
        }))
        .slice(0, 8);
    }

    const dueDateOptions: QuickShortcutOption[] = [
      {
        id: "due:today",
        title: t("calendar.today", "Today"),
        subtitle: t("tasks.shortcutDueToday", "Set the due date to today at the end of the day"),
        group: t("tasks.dueDate", "Due date"),
        selected: quickDueAtLocal === endOfDayLocal(new Date()),
        action: { type: "due_date", dueAtLocal: endOfDayLocal(new Date()) }
      },
      {
        id: "due:tomorrow",
        title: t("calendar.tomorrow", "Tomorrow"),
        subtitle: t("tasks.shortcutDueTomorrow", "Set the due date to tomorrow at the end of the day"),
        group: t("tasks.dueDate", "Due date"),
        selected: quickDueAtLocal === endOfDayLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        action: { type: "due_date", dueAtLocal: endOfDayLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)) }
      },
      {
        id: "due:this_week",
        title: t("tasks.thisWeek", "This week"),
        subtitle: t("tasks.shortcutDueThisWeek", "Set the due date to the upcoming Friday at the end of the day"),
        group: t("tasks.dueDate", "Due date"),
        selected: quickDueAtLocal === upcomingFriday(new Date()),
        action: { type: "due_date", dueAtLocal: upcomingFriday(new Date()) }
      },
      {
        id: "due:next_week",
        title: t("tasks.nextWeek", "Next week"),
        subtitle: t("tasks.shortcutDueNextWeek", "Set the due date to next Friday at the end of the day"),
        group: t("tasks.dueDate", "Due date"),
        selected: quickDueAtLocal === upcomingFriday(new Date(), 1),
        action: { type: "due_date", dueAtLocal: upcomingFriday(new Date(), 1) }
      }
    ];

    const labelOptions: QuickShortcutOption[] = quickAddLabelOptions.map<QuickShortcutOption>((label) => ({
      id: `label:${label.id}`,
      title: label.name,
      group: t("tasks.labels", "Labels"),
      selected: quickLabelIds.includes(label.id),
      color: label.color,
      action: { type: "label", labelId: label.id }
    }));

    const priorityOptions: QuickShortcutOption[] = [
      {
        id: "priority:low",
        title: t("tasks.priorityLow", "Low"),
        group: t("tasks.priority", "Priority"),
        selected: quickPriority === "low",
        action: { type: "priority", priority: "low" }
      },
      {
        id: "priority:medium",
        title: t("tasks.priorityMedium", "Medium"),
        group: t("tasks.priority", "Priority"),
        selected: quickPriority === "medium",
        action: { type: "priority", priority: "medium" }
      },
      {
        id: "priority:high",
        title: t("tasks.priorityHigh", "High"),
        group: t("tasks.priority", "Priority"),
        selected: quickPriority === "high",
        action: { type: "priority", priority: "high" }
      }
    ];

    const assigneeOptions: QuickShortcutOption[] = assignees.map<QuickShortcutOption>((assignee) => ({
      id: `assignee:${assignee.userId}`,
      title: assignee.displayName,
      group: t("tasks.assignees", "Assignees"),
      selected: quickAssignedToUserId === assignee.userId,
      action: { type: "assignee", userId: assignee.userId }
    }));

    return [...assigneeOptions, ...dueDateOptions, ...labelOptions, ...priorityOptions].filter((option) => {
      if (normalizedQuery.length === 0) return true;
      const haystack = `${option.group} ${option.title} ${option.subtitle ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [assignees, quickAddLabelOptions, quickAssignedToUserId, quickDueAtLocal, quickLabelIds, quickPriority, quickShortcutSession, t]);

  const quickShortcutGroups = useMemo(() => {
    const groups: Array<{ name: string; options: QuickShortcutOption[] }> = [];
    for (const option of quickShortcutOptions) {
      const existing = groups.find((group) => group.name === option.group);
      if (existing) {
        existing.options.push(option);
      } else {
        groups.push({ name: option.group, options: [option] });
      }
    }
    return groups;
  }, [quickShortcutOptions]);

  useEffect(() => {
    if (quickShortcutOptions.length === 0) {
      setQuickShortcutActiveIndex(0);
      return;
    }

    setQuickShortcutActiveIndex((current) => Math.min(current, quickShortcutOptions.length - 1));
  }, [quickShortcutOptions]);

  useEffect(() => {
    if (!quickShortcutSession || !quickShortcutPaletteRef.current) return;

    const activeOption = quickShortcutPaletteRef.current.querySelector<HTMLElement>(`[data-shortcut-option-index="${quickShortcutActiveIndex}"]`);
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [quickShortcutActiveIndex, quickShortcutSession, quickShortcutOptions]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (displayMenuRef.current && !displayMenuRef.current.contains(target)) {
        setShowDisplayMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setShowFilterMenu(false);
      }
      if (
        quickShortcutSession &&
        quickShortcutPaletteRef.current &&
        !quickShortcutPaletteRef.current.contains(target) &&
        quickTitleInputRef.current &&
        !quickTitleInputRef.current.contains(target)
      ) {
        setQuickTitle((current) => cleanShortcutToken(current, quickShortcutSession));
        setQuickShortcutSession(null);
        setQuickShortcutAnchor(null);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [quickShortcutSession]);

  useEffect(() => {
    return () => {
      if (calendarHoverHideTimeoutRef.current) {
        window.clearTimeout(calendarHoverHideTimeoutRef.current);
      }
      if (calendarOverflowHideTimeoutRef.current) {
        window.clearTimeout(calendarOverflowHideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (displayMode !== "board") {
      setDragOverStatus(null);
      setDraggingTaskId(null);
    }
  }, [displayMode]);

  useEffect(() => {
    setPreferencesLoaded(false);
    setVisibilityMode("my");
    setSmartView("inbox");
    setSelectedLabelIds([]);
    setLabelMatchMode("or");
    setDisplayMode("list");
    setDensityMode("comfortable");
    setBoardExpanded(false);
    setCalendarTaskView("due");
    setCalendarTaskColorBy("label");

    if (typeof window === "undefined") {
      setPreferencesLoaded(true);
      return;
    }

    const raw = window.localStorage.getItem(preferencesStorageKey);
    if (!raw) {
      setPreferencesLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as TasksUiPreferences;

      if (parsed.visibilityMode === "my" || parsed.visibilityMode === "family") {
        setVisibilityMode(parsed.visibilityMode);
      }
      if (
        parsed.smartView === "inbox" ||
        parsed.smartView === "today" ||
        parsed.smartView === "this_week" ||
        parsed.smartView === "planned" ||
        parsed.smartView === "all" ||
        parsed.smartView === "completed"
      ) {
        setSmartView(parsed.smartView);
      }
      if (Array.isArray(parsed.selectedLabelIds)) {
        setSelectedLabelIds(parsed.selectedLabelIds.filter((value): value is string => typeof value === "string"));
      }
      if (parsed.labelMatchMode === "or" || parsed.labelMatchMode === "and") {
        setLabelMatchMode(parsed.labelMatchMode);
      }
      if (parsed.displayMode === "list" || parsed.displayMode === "board" || parsed.displayMode === "calendar") {
        setDisplayMode(parsed.displayMode);
      }
      if (parsed.densityMode === "compact" || parsed.densityMode === "comfortable" || parsed.densityMode === "spacious") {
        setDensityMode(parsed.densityMode);
      }
      if (typeof parsed.boardExpanded === "boolean") {
        setBoardExpanded(parsed.boardExpanded);
      }
      if (parsed.calendarTaskView === "due" || parsed.calendarTaskView === "duration") {
        setCalendarTaskView(parsed.calendarTaskView);
      }
      if (
        parsed.calendarTaskColorBy === "label" ||
        parsed.calendarTaskColorBy === "status" ||
        parsed.calendarTaskColorBy === "priority" ||
        parsed.calendarTaskColorBy === "due_proximity" ||
        parsed.calendarTaskColorBy === "visibility"
      ) {
        setCalendarTaskColorBy(parsed.calendarTaskColorBy);
      }
    } catch {
      // Ignore malformed preference payloads.
    }

    setPreferencesLoaded(true);
  }, [preferencesStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !preferencesLoaded) {
      return;
    }

    const payload: TasksUiPreferences = {
      visibilityMode,
      smartView,
      selectedLabelIds,
      labelMatchMode,
      displayMode,
      densityMode,
      boardExpanded,
      calendarTaskView,
      calendarTaskColorBy
    };

    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(payload));
  }, [preferencesStorageKey, preferencesLoaded, visibilityMode, smartView, selectedLabelIds, labelMatchMode, displayMode, densityMode, boardExpanded, calendarTaskView, calendarTaskColorBy]);

  const queryKey = ["tasks", familyId, visibilityMode] as const;

  const { data, isPending, error } = useQuery({
    queryKey,
    queryFn: () => fetchTasks(familyId, visibilityMode === "my"),
    initialData: visibilityMode === "my" ? initialTasks : undefined
  });

  useEffect(() => {
    if (!selectedTaskId) return;
    if (!(data ?? []).some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [data, selectedTaskId]);

  useEffect(() => {
    setCommentDraft("");
    setCommentsSort("oldest");
  }, [selectedTaskId]);

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

  const selectedTaskCommentsQuery = useQuery({
    queryKey: ["task-comments", selectedTaskId],
    queryFn: () => fetchTaskComments(selectedTaskId!),
    enabled: Boolean(selectedTaskId)
  });

  const commentMutation = useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? t("tasks.commentsSaveError", "Failed to save comment"));
      }
    },
    onSuccess: (_, variables) => {
      setCommentDraft("");
      queryClient.invalidateQueries({ queryKey: ["task-comments", variables.taskId] });
    }
  });

  const drawerSaveMutation = useMutation({
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

  const quickAddMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = (await response.json()) as { error?: string; taskId?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? t("tasks.saveError", "Failed to save task"));
      }
      return payload;
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

  useEffect(() => {
    if (!selectedTaskId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`task-comments-${selectedTaskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${selectedTaskId}`
        },
        () => queryClient.invalidateQueries({ queryKey: ["task-comments", selectedTaskId] })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, selectedTaskId]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = startOfWeek(todayStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(todayEnd, { weekStartsOn: 1 });
  const nextWeekEnd = new Date(todayEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const filteredTasks = useMemo(() => {
    const sourceTasks = data ?? [];
    let tasksForView = sourceTasks;

    if (smartView === "inbox") {
      tasksForView = tasksForView.filter((task) => task.status === "inbox");
    } else if (smartView === "today") {
      tasksForView = tasksForView.filter((task) => {
        if (task.status === "done") return false;
        const due = dueDateOnly(task);
        if (!due) return false;
        return isSameDay(due, todayStart) || isOverdue(task, now);
      });
    } else if (smartView === "this_week") {
      tasksForView = tasksForView.filter((task) => {
        if (task.status === "done") return false;
        const due = dueDateOnly(task);
        if (!due) return false;
        return (due >= weekStart && due <= weekEnd) || isOverdue(task, now);
      });
    } else if (smartView === "planned") {
      tasksForView = tasksForView.filter((task) => task.status !== "done" && Boolean(task.dueAt));
    } else if (smartView === "completed") {
      tasksForView = tasksForView.filter((task) => task.status === "done");
    } else if (smartView === "all") {
      tasksForView = tasksForView.filter((task) => (showCompleted ? true : task.status !== "done"));
    } else {
      tasksForView = tasksForView.filter((task) => (showCompleted ? true : task.status !== "done"));
    }

    if (selectedLabelIds.length > 0) {
      tasksForView = tasksForView.filter((task) => {
        const taskLabelIds = new Set(task.labels.map((label) => label.id));
        if (labelMatchMode === "and") {
          return selectedLabelIds.every((labelId) => taskLabelIds.has(labelId));
        }
        return selectedLabelIds.some((labelId) => taskLabelIds.has(labelId));
      });
    }

    if (priorityFilter !== "all") {
      tasksForView = tasksForView.filter((task) => task.priority === priorityFilter);
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (normalizedSearch.length > 0) {
      tasksForView = tasksForView.filter((task) => {
        const labelMatch = task.labels.some((label) => label.name.toLowerCase().includes(normalizedSearch));
        const titleMatch = task.title.toLowerCase().includes(normalizedSearch);
        const descriptionMatch = (task.description ?? "").toLowerCase().includes(normalizedSearch);
        return titleMatch || descriptionMatch || labelMatch;
      });
    }

    if (smartView !== "completed" && dateFilter === "today") {
      tasksForView = tasksForView.filter((task) => {
        const due = dueDateOnly(task);
        return due ? isSameDay(due, todayStart) : false;
      });
    } else if (smartView !== "completed" && dateFilter === "overdue") {
      tasksForView = tasksForView.filter((task) => isOverdue(task, now));
    } else if (smartView !== "completed" && dateFilter === "next7") {
      tasksForView = tasksForView.filter((task) => {
        const due = task.dueAt ? new Date(task.dueAt) : null;
        return due ? due >= todayStart && due <= nextWeekEnd : false;
      });
    } else if (smartView !== "completed" && dateFilter === "no_date") {
      tasksForView = tasksForView.filter((task) => !task.dueAt);
    }

    const sortedTasks = [...tasksForView].sort((left, right) => {
      if (smartView === "completed") {
        return new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime();
      }

      if (sortBy === "priority") {
        return priorityWeight(right.priority) - priorityWeight(left.priority);
      }

      if (sortBy === "date_added") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      if (sortBy === "date") {
        const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftDue - rightDue;
      }

      return 0;
    });

    return sortedTasks;
  }, [data, showCompleted, selectedLabelIds, labelMatchMode, smartView, priorityFilter, searchQuery, dateFilter, sortBy, now, nextWeekEnd, todayStart, weekStart, weekEnd]);

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [calendarMonth]);

  const dueTasksByDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const task of filteredTasks) {
      const due = dueDateOnly(task);
      if (!due) continue;
      const key = format(due, "yyyy-MM-dd");
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    }
    return map;
  }, [filteredTasks]);

  const durationTasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTaskSegment[]>();

    for (const task of filteredTasks) {
      const taskStart = startDateOnly(task) ?? dueDateOnly(task);
      const taskEnd = dueDateOnly(task) ?? taskStart;

      if (!taskStart || !taskEnd) continue;

      const rangeStart = taskStart <= taskEnd ? taskStart : taskEnd;
      const rangeEnd = taskEnd >= taskStart ? taskEnd : taskStart;
      const cursor = new Date(rangeStart);

      while (cursor <= rangeEnd) {
        const key = format(cursor, "yyyy-MM-dd");
        const bucket = map.get(key) ?? [];
        bucket.push({
          task,
          isStart: isSameDay(cursor, rangeStart),
          isEnd: isSameDay(cursor, rangeEnd)
        });
        map.set(key, bucket);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return map;
  }, [filteredTasks]);

  const calendarDurationLanesByDay = useMemo(() => {
    const map = new Map<string, CalendarTaskLaneSegment[]>();

    for (let weekIndex = 0; weekIndex < monthGridDays.length; weekIndex += 7) {
      const weekDays = monthGridDays.slice(weekIndex, weekIndex + 7);
      if (weekDays.length === 0) continue;

      const weekStartDay = weekDays[0];
      const weekEndDay = weekDays[weekDays.length - 1];
      const weekTasks = filteredTasks
        .map((task) => {
          const taskStart = startDateOnly(task) ?? dueDateOnly(task);
          const taskEnd = dueDateOnly(task) ?? taskStart;
          if (!taskStart || !taskEnd) return null;

          const rangeStart = compareCalendarDate(taskStart, taskEnd) <= 0 ? taskStart : taskEnd;
          const rangeEnd = compareCalendarDate(taskStart, taskEnd) <= 0 ? taskEnd : taskStart;

          if (compareCalendarDate(rangeEnd, weekStartDay) < 0 || compareCalendarDate(rangeStart, weekEndDay) > 0) {
            return null;
          }

          return { task, rangeStart, rangeEnd };
        })
        .filter((value): value is { task: TaskRow; rangeStart: Date; rangeEnd: Date } => Boolean(value))
        .sort((left, right) => {
          const startCompare = compareCalendarDate(left.rangeStart, right.rangeStart);
          if (startCompare !== 0) return startCompare;
          const endCompare = compareCalendarDate(left.rangeEnd, right.rangeEnd);
          if (endCompare !== 0) return endCompare;
          return left.task.title.localeCompare(right.task.title);
        });

      const laneEndDates: Date[] = [];

      for (const entry of weekTasks) {
        let lane = laneEndDates.findIndex((laneEnd) => compareCalendarDate(laneEnd, entry.rangeStart) < 0);
        if (lane === -1) {
          lane = laneEndDates.length;
          laneEndDates.push(entry.rangeEnd);
        } else {
          laneEndDates[lane] = entry.rangeEnd;
        }

        for (const day of weekDays) {
          if (compareCalendarDate(day, entry.rangeStart) < 0 || compareCalendarDate(day, entry.rangeEnd) > 0) {
            continue;
          }

          const key = format(day, "yyyy-MM-dd");
          const bucket = map.get(key) ?? [];
          bucket.push({
            task: entry.task,
            lane,
            isStart: isSameDay(day, entry.rangeStart),
            isEnd: isSameDay(day, entry.rangeEnd)
          });
          map.set(key, bucket);
        }
      }
    }

    for (const [key, segments] of map.entries()) {
      segments.sort((left, right) => left.lane - right.lane || left.task.title.localeCompare(right.task.title));
      map.set(key, segments);
    }

    return map;
  }, [filteredTasks, monthGridDays]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedCalendarDay) return [] as TaskRow[];
    const key = format(selectedCalendarDay, "yyyy-MM-dd");
    if (calendarTaskView === "duration") {
      const segments = durationTasksByDay.get(key) ?? [];
      const seen = new Set<string>();
      return segments
        .filter(({ task }) => {
          if (seen.has(task.id)) return false;
          seen.add(task.id);
          return true;
        })
        .map(({ task }) => task);
    }
    return dueTasksByDay.get(key) ?? [];
  }, [calendarTaskView, dueTasksByDay, durationTasksByDay, selectedCalendarDay]);

  const sortedComments = useMemo(() => {
    const comments = [...(selectedTaskCommentsQuery.data ?? [])];
    comments.sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return commentsSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
    return comments;
  }, [commentsSort, selectedTaskCommentsQuery.data]);

  const boardColumns = useMemo(() => {
    const map = new Map<TaskStatus, TaskRow[]>();
    for (const status of boardStatuses()) {
      map.set(status, []);
    }
    for (const task of filteredTasks) {
      const bucket = map.get(task.status) ?? [];
      bucket.push(task);
      map.set(task.status, bucket);
    }
    return map;
  }, [filteredTasks]);

  const allTasks = data ?? [];
  const areaCounts = useMemo(() => {
    const inbox = allTasks.filter((task) => task.status === "inbox").length;
    const today = allTasks.filter((task) => {
      if (task.status === "done") return false;
      const due = dueDateOnly(task);
      if (!due) return false;
      return isSameDay(due, todayStart) || isOverdue(task, now);
    }).length;
    const thisWeek = allTasks.filter((task) => {
      if (task.status === "done") return false;
      const due = dueDateOnly(task);
      if (!due) return false;
      return (due >= weekStart && due <= weekEnd) || isOverdue(task, now);
    }).length;
    const planned = allTasks.filter((task) => task.status !== "done" && Boolean(task.dueAt)).length;
    const all = allTasks.length;
    const completed = allTasks.filter((task) => task.status === "done").length;
    return { inbox, today, thisWeek, planned, all, completed };
  }, [allTasks, now, todayStart, weekEnd, weekStart]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return allTasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [allTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedTaskId || !selectedTask) {
      setDrawerDraft(null);
      setDrawerTaskId(null);
      setDrawerEditor(null);
      return;
    }

    if (drawerTaskId === selectedTask.id) {
      return;
    }

    setDrawerTaskId(selectedTask.id);
    setDrawerEditor(null);
    setShowLabelPicker(false);
    setDrawerSaveError(null);
    setDrawerDraft({
      title: selectedTask.title,
      description: selectedTask.description ?? "",
      status: selectedTask.status,
      priority: selectedTask.priority,
      startAtLocal: formatDateTimeLocal(selectedTask.startAt),
      dueAtLocal: formatDateTimeLocal(selectedTask.dueAt),
      assignedToUserId: selectedTask.assignedToUserId ?? "",
      visibility: selectedTask.visibility,
      labelIds: selectedTask.labels.map((label) => label.id),
      selectedMemberIds: selectedTask.selectedMemberIds ?? []
    });
  }, [drawerTaskId, selectedTask, selectedTaskId]);

  const isDrawerDirty = useMemo(() => {
    if (!selectedTask || !drawerDraft) return false;
    return (
      drawerDraft.title !== selectedTask.title ||
      drawerDraft.description !== (selectedTask.description ?? "") ||
      drawerDraft.status !== selectedTask.status ||
      drawerDraft.priority !== selectedTask.priority ||
      drawerDraft.startAtLocal !== formatDateTimeLocal(selectedTask.startAt) ||
      drawerDraft.dueAtLocal !== formatDateTimeLocal(selectedTask.dueAt) ||
      drawerDraft.assignedToUserId !== (selectedTask.assignedToUserId ?? "") ||
      drawerDraft.visibility !== selectedTask.visibility ||
      !sameLabelSet(drawerDraft.labelIds, selectedTask.labels.map((label) => label.id)) ||
      !sameLabelSet(drawerDraft.selectedMemberIds, selectedTask.selectedMemberIds ?? [])
    );
  }, [drawerDraft, selectedTask]);

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

  function renderOwner(task: TaskRow) {
    if (visibilityMode === "my" || task.ownerUserId === task.assignedToUserId || task.ownerUserId === currentUserId) {
      return null;
    }

    const owner = assigneeMap.get(task.ownerUserId);
    const ownerName = owner?.displayName ?? t("common.unknown", "Unknown");
    return <span className="loom-task-owner">{t("tasks.ownerPrefix", "Owner")}: {ownerName}</span>;
  }

  function renderLabelChips(task: TaskRow) {
    if (task.labels.length === 0) return null;

    return (
      <div className="loom-label-list">
        {task.labels.map((label) => (
          <span key={label.id} className="loom-task-label-chip" style={{ borderColor: label.color }}>
            <i style={{ backgroundColor: label.color }} />
            {label.name}
          </span>
        ))}
      </div>
    );
  }

  function getCalendarTaskPalette(task: TaskRow) {
    if (task.status === "done") {
      return {
        background: "#ececec",
        borderColor: "#d4d4d4",
        textColor: "#7a7a7a"
      };
    }

    if (calendarTaskColorBy === "status") {
      const palette: Record<TaskStatus, { background: string; borderColor: string; textColor: string }> = {
        inbox: { background: "#e0ecff", borderColor: "#7aa6ff", textColor: "#1f4ea3" },
        planned: { background: "#e7e8ff", borderColor: "#8b90ff", textColor: "#4a4fb8" },
        in_progress: { background: "#def7f1", borderColor: "#3ab99c", textColor: "#136b58" },
        waiting: { background: "#fff2de", borderColor: "#f0a647", textColor: "#9a5d10" },
        done: { background: "#ececec", borderColor: "#d4d4d4", textColor: "#7a7a7a" }
      };
      return palette[task.status];
    }

    if (calendarTaskColorBy === "priority") {
      const palette = {
        low: { background: "#e8f6ed", borderColor: "#69b983", textColor: "#1f6f3f" },
        medium: { background: "#fff4de", borderColor: "#f0b14d", textColor: "#9a6511" },
        high: { background: "#ffe5e5", borderColor: "#ef6b6b", textColor: "#a52a2a" }
      };
      return palette[task.priority];
    }

    if (calendarTaskColorBy === "due_proximity") {
      const due = task.dueAt ? new Date(task.dueAt) : null;
      if (!due) {
        return { background: "#f2f4f7", borderColor: "#cfd6df", textColor: "#566170" };
      }
      if (isOverdue(task, now)) {
        return { background: "#ffe5e5", borderColor: "#ef6b6b", textColor: "#a52a2a" };
      }
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(todayStart.getDate() + 1);
      const nextWeek = new Date(todayStart);
      nextWeek.setDate(todayStart.getDate() + 7);
      if (due < tomorrow) {
        return { background: "#fff1db", borderColor: "#f59e0b", textColor: "#9a6511" };
      }
      if (due <= nextWeek) {
        return { background: "#e4f0ff", borderColor: "#60a5fa", textColor: "#1d4ed8" };
      }
      return { background: "#e6f8f1", borderColor: "#3ab99c", textColor: "#136b58" };
    }

    if (calendarTaskColorBy === "visibility" && visibilityMode === "family") {
      const palette = {
        private: { background: "#ffe7f1", borderColor: "#ef5d95", textColor: "#a52b5f" },
        family: { background: "#e6efff", borderColor: "#4f7df3", textColor: "#234da7" },
        selected_members: { background: "#efe8ff", borderColor: "#8b5cf6", textColor: "#5b33b6" }
      };
      return palette[task.visibility];
    }

    if (task.labels.length > 0) {
      const colors = task.labels.slice(0, 3).map((label) => label.color);
      return {
        background:
          colors.length === 1
            ? `${colors[0]}22`
            : `linear-gradient(135deg, ${colors
                .map((color, index) => `${color}22 ${Math.round(index * (100 / colors.length))}%`)
                .join(", ")})`,
        borderColor: colors[0],
        textColor: "#0f5132"
      };
    }

    return {
      background: "#e6f8f1",
      borderColor: "#3ab99c",
      textColor: "#136b58"
    };
  }

  function getCalendarTaskStyle(task: TaskRow) {
    const palette = getCalendarTaskPalette(task);
    const isAssignedToCurrentUser = !task.assignedToUserId || task.assignedToUserId === currentUserId;

    return {
      "--calendar-task-background": isAssignedToCurrentUser ? palette.background : "#ffffff",
      "--calendar-task-border": palette.borderColor,
      "--calendar-task-text": palette.textColor,
      "--calendar-task-decoration": task.status === "done" ? "line-through" : "none"
    } as CSSProperties;
  }

  function showCalendarHoverCard(task: TaskRow, event: ReactMouseEvent<HTMLElement>) {
    if (calendarHoverHideTimeoutRef.current) {
      window.clearTimeout(calendarHoverHideTimeoutRef.current);
      calendarHoverHideTimeoutRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setCalendarHoverCard({
      taskId: task.id,
      left: rect.left + rect.width / 2,
      top: rect.top - 10
    });
  }

  function hideCalendarHoverCard(taskId?: string) {
    if (calendarHoverHideTimeoutRef.current) {
      window.clearTimeout(calendarHoverHideTimeoutRef.current);
    }
    calendarHoverHideTimeoutRef.current = window.setTimeout(() => {
      setCalendarHoverCard((current) => {
        if (!current) return null;
        if (taskId && current.taskId !== taskId) return current;
        return null;
      });
      calendarHoverHideTimeoutRef.current = null;
    }, 140);
  }

  function showCalendarOverflowCard(dayKey: string, taskIds: string[], event: ReactMouseEvent<HTMLElement>) {
    if (calendarOverflowHideTimeoutRef.current) {
      window.clearTimeout(calendarOverflowHideTimeoutRef.current);
      calendarOverflowHideTimeoutRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setCalendarOverflowCard({
      dayKey,
      taskIds,
      left: rect.left + rect.width / 2,
      top: rect.top - 8
    });
  }

  function hideCalendarOverflowCard(dayKey?: string) {
    if (calendarOverflowHideTimeoutRef.current) {
      window.clearTimeout(calendarOverflowHideTimeoutRef.current);
    }
    calendarOverflowHideTimeoutRef.current = window.setTimeout(() => {
      setCalendarOverflowCard((current) => {
        if (!current) return null;
        if (dayKey && current.dayKey !== dayKey) return current;
        return null;
      });
      calendarOverflowHideTimeoutRef.current = null;
    }, 140);
  }

  function renderTaskCard(task: TaskRow, compact = false) {
    const densityClass = densityMode === "compact" ? "is-density-compact" : densityMode === "spacious" ? "is-density-spacious" : "";
    const overdue = isOverdue(task, now);
    const priorityLabel =
      task.priority === "high" ? t("tasks.priorityHigh", "High") : task.priority === "medium" ? t("tasks.priorityMedium", "Medium") : t("tasks.priorityLow", "Low");

    return (
      <article key={task.id} className={`loom-task-item ${compact ? "is-compact" : ""} ${densityClass}`.trim()}>
        <button
          className={`loom-home-checkbox ${task.status === "done" ? "is-done" : ""}`}
          type="button"
          aria-label={task.status === "done" ? t("tasks.markActive", "Mark task as active") : t("tasks.markComplete", "Mark task as complete")}
          onClick={() => updateMutation.mutate({ taskId: task.id, body: { status: task.status === "done" ? "planned" : "done" } })}
        />

        <div className="loom-task-main">
          <div className="loom-task-line">
            <div className="loom-task-left-block">
              <div className="loom-task-left-top">
                <button
                  type="button"
                  className={`loom-task-title-button ${task.status === "done" ? "loom-home-line-through" : ""}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  {task.title}
                </button>
                <span className="loom-home-pill is-muted">{statusLabel(task.status, t)}</span>
              </div>
              <p className={`loom-task-meta ${overdue ? "is-overdue" : ""}`}>
                {formatDue(task, t, dateLocale)}
                {overdue ? <span className="loom-task-overdue-flag">{t("tasks.overdue", "Overdue")}</span> : null}
              </p>
            </div>

            <div className="loom-task-right-block">
              <div className="loom-task-right-top">
                {renderAssignee(task.assignedToUserId)}
                {renderOwner(task)}
              </div>
              <div className="loom-task-right-bottom">
                {renderLabelChips(task)}
                <span className="loom-task-priority-pill" style={{ color: priorityColor(task.priority), borderColor: priorityColor(task.priority) }}>
                  {priorityLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  async function saveDrawerTask() {
    if (!selectedTask || !drawerDraft || !isDrawerDirty || drawerSaveMutation.isPending) {
      return;
    }
    setDrawerSaveError(null);

    const originalStartAtLocal = formatDateTimeLocal(selectedTask.startAt);
    const originalDueAtLocal = formatDateTimeLocal(selectedTask.dueAt);
    const originalLabelIds = selectedTask.labels.map((label) => label.id);
    const originalSelectedMemberIds = selectedTask.selectedMemberIds ?? [];

    const body: Record<string, unknown> = {};
    if (drawerDraft.title !== selectedTask.title) body.title = drawerDraft.title;
    if (drawerDraft.description !== (selectedTask.description ?? "")) body.description = drawerDraft.description || null;
    if (drawerDraft.status !== selectedTask.status) body.status = drawerDraft.status;
    if (drawerDraft.priority !== selectedTask.priority) body.priority = drawerDraft.priority;
    if (drawerDraft.startAtLocal !== originalStartAtLocal) body.startAt = drawerDraft.startAtLocal ? new Date(drawerDraft.startAtLocal).toISOString() : null;
    if (drawerDraft.dueAtLocal !== originalDueAtLocal) body.dueAt = drawerDraft.dueAtLocal ? new Date(drawerDraft.dueAtLocal).toISOString() : null;
    if (drawerDraft.assignedToUserId !== (selectedTask.assignedToUserId ?? "")) body.assignedToUserId = drawerDraft.assignedToUserId || null;
    if (drawerDraft.visibility !== selectedTask.visibility) body.visibility = drawerDraft.visibility;
    if (!sameLabelSet(drawerDraft.labelIds, originalLabelIds)) body.labelIds = drawerDraft.labelIds;

    const selectedMembersChanged = !sameLabelSet(drawerDraft.selectedMemberIds, originalSelectedMemberIds);
    if (drawerDraft.visibility === "selected_members" && (selectedMembersChanged || drawerDraft.visibility !== selectedTask.visibility)) {
      body.selectedMemberIds = drawerDraft.selectedMemberIds;
    }

    try {
      await drawerSaveMutation.mutateAsync({
        taskId: selectedTask.id,
        body
      });
      setDrawerEditor(null);
      closeDrawer();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("tasks.updateError", "Failed to update task");
      setDrawerSaveError(normalizeServerErrorMessage(message));
    }
  }

  function closeDrawer() {
    setSelectedTaskId(null);
    setDrawerDraft(null);
    setDrawerTaskId(null);
    setDrawerEditor(null);
    setShowLabelPicker(false);
    setDrawerSaveError(null);
    setCommentDraft("");
  }

  function closeQuickAdd() {
    setShowQuickAdd(false);
    setQuickTitle("");
    setQuickDescription("");
    setQuickDueAtLocal("");
    setQuickPriority("medium");
    setQuickAssignedToUserId(currentUserId);
    setQuickLabelIds([]);
    setQuickShortcutSession(null);
    setQuickShortcutActiveIndex(0);
    setQuickShortcutAnchor(null);
    setQuickAddError(null);
  }

  function applyQuickShortcutOption(option: QuickShortcutOption) {
    const { action } = option;

    switch (action.type) {
      case "label":
        setQuickLabelIds((current) => (current.includes(action.labelId) ? current : [...current, action.labelId]));
        return;
      case "assignee":
        setQuickAssignedToUserId(action.userId);
        return;
      case "due_date":
        setQuickDueAtLocal(action.dueAtLocal);
        return;
      case "priority":
        setQuickPriority(action.priority);
        return;
      default:
        return;
    }
  }

  function commitQuickShortcut(sessionOverride?: QuickShortcutSession | null) {
    const session = sessionOverride ?? quickShortcutSession;
    if (!session) return;

    setQuickTitle((current) => cleanShortcutToken(current, session));
    setQuickShortcutSession(null);
    setQuickShortcutAnchor(null);
    window.requestAnimationFrame(() => {
      quickTitleInputRef.current?.focus();
    });
  }

  function syncQuickShortcutFromInput(input: HTMLInputElement) {
    const caret = input.selectionStart ?? input.value.length;
    const nextSession = findQuickShortcutSession(input.value, caret);
    setQuickShortcutSession(nextSession);
    setQuickShortcutActiveIndex(0);
    setQuickShortcutAnchor(nextSession ? getInputCaretAnchor(input, caret) : null);
  }

  function handleQuickTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!quickShortcutSession) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (quickShortcutOptions.length === 0) return;
      setQuickShortcutActiveIndex((current) => (current + 1) % quickShortcutOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (quickShortcutOptions.length === 0) return;
      setQuickShortcutActiveIndex((current) => (current - 1 + quickShortcutOptions.length) % quickShortcutOptions.length);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      commitQuickShortcut();
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const activeOption = quickShortcutOptions[quickShortcutActiveIndex];
      if (activeOption) {
        applyQuickShortcutOption(activeOption);
      }
      commitQuickShortcut();
    }
  }

  async function submitQuickAdd() {
    const committedTitle = quickShortcutSession ? cleanShortcutToken(quickTitle, quickShortcutSession) : quickTitle;
    const trimmedTitle = committedTitle.trim();
    if (!trimmedTitle) {
      setQuickAddError(t("tasks.quickAddTitleRequired", "Task name is required"));
      return;
    }

    setQuickAddError(null);

    const parsed = extractLabelIdsFromTitle(trimmedTitle, quickAddLabelOptions);
    const labelIds = Array.from(new Set([...quickLabelIds, ...parsed.labelIds]));
    const finalTitle = parsed.cleanedTitle || trimmedTitle;

    try {
        await quickAddMutation.mutateAsync({
          familyId,
          title: finalTitle,
          description: quickDescription.trim() || null,
          status: "inbox",
          priority: quickPriority,
          startAt: new Date().toISOString(),
          dueAt: quickDueAtLocal ? new Date(quickDueAtLocal).toISOString() : null,
          assignedToUserId: quickAssignedToUserId || currentUserId,
          visibility: visibilityMode === "my" ? "private" : "family",
          labelIds
        });
      closeQuickAdd();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("tasks.saveError", "Failed to save task");
      setQuickAddError(normalizeServerErrorMessage(message));
    }
  }

  function handleBoardDrop(targetStatus: TaskStatus) {
    if (!draggingTaskId) {
      setDragOverStatus(null);
      return;
    }

    const draggedTask = allTasks.find((task) => task.id === draggingTaskId);
    if (draggedTask && draggedTask.status !== targetStatus) {
      updateMutation.mutate({ taskId: draggingTaskId, body: { status: targetStatus } });
    }

    setDragOverStatus(null);
    setDraggingTaskId(null);
  }

  return (
    <div className="loom-stack">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.tasks", "Tasks")}</h2>
          <p className="loom-module-subtitle">{t("tasks.subtitle", "Personal-first task planning with shared family coordination.")}</p>
        </div>
        <div className="loom-task-top-actions-right">
          {displayMode === "board" ? (
            <button
              type="button"
              className="loom-task-icon-button loom-task-expand-desktop"
              aria-label={boardExpanded ? t("tasks.collapseBoard", "Use default width") : t("tasks.expandBoard", "Use full width")}
              onClick={() => setBoardExpanded((value) => !value)}
            >
              {boardExpanded ? "⤡" : "⤢"}
            </button>
          ) : null}

          <div className="loom-task-popup-anchor" ref={filterMenuRef}>
            <button
              type="button"
              className="loom-task-icon-button"
              aria-label={t("tasks.filters", "Filters")}
              onClick={() => {
                setShowFilterMenu((value) => !value);
                setShowDisplayMenu(false);
              }}
            >
              ≡
            </button>
            {showFilterMenu ? (
              <div className="loom-task-popup">
                <p className="loom-task-popup-title">{t("tasks.filters", "Filters")}</p>
                <div className="loom-stack-sm">
                  <label className="loom-field">
                    <span>{t("common.search", "Search")}</span>
                    <input
                      className="loom-input"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t("tasks.searchPlaceholder", "Search tasks")}
                    />
                  </label>
                  <label className="loom-field">
                    <span>{t("tasks.priority", "Priority")}</span>
                    <select className="loom-input" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}>
                      <option value="all">{t("tasks.filterAll", "All")}</option>
                      <option value="low">{t("tasks.priorityLow", "Low")}</option>
                      <option value="medium">{t("tasks.priorityMedium", "Medium")}</option>
                      <option value="high">{t("tasks.priorityHigh", "High")}</option>
                    </select>
                  </label>
                  <label className="loom-field">
                    <span>{t("tasks.dateFilter", "Date")}</span>
                    <select className="loom-input" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
                      <option value="all">{t("tasks.filterAll", "All")}</option>
                      <option value="today">{t("calendar.today", "Today")}</option>
                      <option value="overdue">{t("tasks.overdue", "Overdue")}</option>
                      <option value="next7">{t("tasks.next7", "Next 7 days")}</option>
                      <option value="no_date">{t("tasks.noDate", "No date")}</option>
                    </select>
                  </label>
                  <label className="loom-field">
                    <span>{t("tasks.sorting", "Sort")}</span>
                    <select className="loom-input" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
                      <option value="none">{t("tasks.sortNone", "None")}</option>
                      <option value="date">{t("tasks.sortDate", "Date")}</option>
                      <option value="date_added">{t("tasks.sortDateAdded", "Date added")}</option>
                      <option value="priority">{t("tasks.sortPriority", "Priority")}</option>
                    </select>
                  </label>
                  <label className="loom-checkbox-row">
                    <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />
                    <span>{t("tasks.showCompleted", "Completed tasks")}</span>
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className="loom-task-popup-anchor" ref={displayMenuRef}>
            <button
              type="button"
              className="loom-task-icon-button"
              aria-label={t("tasks.displaySettings", "Display settings")}
              onClick={() => {
                setShowDisplayMenu((value) => !value);
                setShowFilterMenu(false);
              }}
            >
              ⊞
            </button>
            {showDisplayMenu ? (
              <div className="loom-task-popup">
                <p className="loom-task-popup-title">{t("tasks.layout", "Layout")}</p>
                <button type="button" className="loom-task-popup-option" onClick={() => setDisplayMode("list")}>
                  <span>{t("tasks.displayList", "List")}</span>
                  <span>{displayMode === "list" ? "✓" : ""}</span>
                </button>
                <button type="button" className="loom-task-popup-option" onClick={() => setDisplayMode("board")}>
                  <span>{t("tasks.displayBoard", "Board")}</span>
                  <span>{displayMode === "board" ? "✓" : ""}</span>
                </button>
                <button type="button" className="loom-task-popup-option" onClick={() => setDisplayMode("calendar")}>
                  <span>{t("tasks.displayCalendar", "Calendar")}</span>
                  <span>{displayMode === "calendar" ? "✓" : ""}</span>
                </button>

                <p className="loom-task-popup-title mt-3">{t("tasks.density", "Density")}</p>
                <button type="button" className="loom-task-popup-option" onClick={() => setDensityMode("compact")}>
                  <span>{t("tasks.densityCompact", "Compact")}</span>
                  <span>{densityMode === "compact" ? "✓" : ""}</span>
                </button>
                <button type="button" className="loom-task-popup-option" onClick={() => setDensityMode("comfortable")}>
                  <span>{t("tasks.densityComfortable", "Comfortable")}</span>
                  <span>{densityMode === "comfortable" ? "✓" : ""}</span>
                </button>
                <button type="button" className="loom-task-popup-option" onClick={() => setDensityMode("spacious")}>
                  <span>{t("tasks.densitySpacious", "Spacious")}</span>
                  <span>{densityMode === "spacious" ? "✓" : ""}</span>
                </button>
              </div>
            ) : null}
          </div>

          <button type="button" className="loom-task-create-plus" aria-label={t("tasks.new", "New task")} onClick={() => setShowQuickAdd(true)}>
            +
          </button>
        </div>
      </section>

      <div className={`loom-tasks-redesign ${displayMode === "board" && boardExpanded ? "is-board-expanded" : ""}`}>
      <aside className="loom-tasks-nav loom-card">
        <div className="loom-task-segmented">
          <button type="button" className={visibilityMode === "my" ? "is-active" : ""} onClick={() => setVisibilityMode("my")}>{t("tasks.my", "My")}</button>
          <button type="button" className={visibilityMode === "family" ? "is-active" : ""} onClick={() => setVisibilityMode("family")}>{t("tasks.family", "Family")}</button>
        </div>

        <div className="loom-stack-sm mt-3">
          <button type="button" className={`loom-task-nav-link has-count ${smartView === "inbox" ? "is-active" : ""}`} onClick={() => setSmartView("inbox")}>
            <span>{t("tasks.viewInbox", "Inbox")}</span>
            <span className="loom-task-nav-count">{areaCounts.inbox}</span>
          </button>
          <button type="button" className={`loom-task-nav-link has-count ${smartView === "today" ? "is-active" : ""}`} onClick={() => setSmartView("today")}>
            <span>{t("tasks.viewToday", "Today")}</span>
            <span className="loom-task-nav-count">{areaCounts.today}</span>
          </button>
          <button type="button" className={`loom-task-nav-link has-count ${smartView === "this_week" ? "is-active" : ""}`} onClick={() => setSmartView("this_week")}>
            <span>{t("tasks.viewThisWeek", "This week")}</span>
            <span className="loom-task-nav-count">{areaCounts.thisWeek}</span>
          </button>
          <button type="button" className={`loom-task-nav-link has-count ${smartView === "planned" ? "is-active" : ""}`} onClick={() => setSmartView("planned")}>
            <span>{t("tasks.viewPlanned", "Planned")}</span>
            <span className="loom-task-nav-count">{areaCounts.planned}</span>
          </button>
          <button type="button" className={`loom-task-nav-link has-count ${smartView === "all" ? "is-active" : ""}`} onClick={() => setSmartView("all")}>
            <span>{t("tasks.viewAll", "All")}</span>
            <span className="loom-task-nav-count">{areaCounts.all}</span>
          </button>
          <button type="button" className={`loom-task-nav-link has-count ${smartView === "completed" ? "is-active" : ""}`} onClick={() => setSmartView("completed")}>
            <span>{t("tasks.viewCompleted", "Completed")}</span>
            <span className="loom-task-nav-count">{areaCounts.completed}</span>
          </button>
        </div>

        <div className="mt-4">
          <div className="loom-row-between">
            <p className="loom-lists-group-title m-0">{t("tasks.labels", "Labels")}</p>
            {selectedLabelIds.length > 1 ? (
              <div className="loom-task-comment-sort-toggle" role="group" aria-label={t("tasks.labelMatchMode", "Label match mode")}>
                <button
                  type="button"
                  className={labelMatchMode === "or" ? "is-active" : ""}
                  onClick={() => setLabelMatchMode("or")}
                >
                  {t("tasks.matchAny", "Any")}
                </button>
                <button
                  type="button"
                  className={labelMatchMode === "and" ? "is-active" : ""}
                  onClick={() => setLabelMatchMode("and")}
                >
                  {t("tasks.matchAll", "All")}
                </button>
              </div>
            ) : null}
          </div>
          <div className="loom-stack-sm">
            {activeLabels.map((label) => (
              <button
                key={label.id}
                type="button"
                className={`loom-task-nav-link ${selectedLabelIds.includes(label.id) ? "is-active" : ""}`}
                onClick={() =>
                  setSelectedLabelIds((current) =>
                    current.includes(label.id) ? current.filter((value) => value !== label.id) : [...current, label.id]
                  )
                }
              >
                <span className="loom-task-label-bullet" style={{ backgroundColor: label.color }} />
                {label.name}
              </button>
            ))}
            {activeLabels.length === 0 ? <p className="loom-muted small m-0">{t("tasks.noLabels", "No labels yet.")}</p> : null}
          </div>
        </div>
      </aside>

      <section className="loom-tasks-content">
        {isPending ? <p className="loom-muted">{t("tasks.loading", "Loading tasks...")}</p> : null}
        {error ? <p className="loom-feedback-error">{error.message}</p> : null}

        {!isPending && !error && displayMode === "list" ? (
          <section className="loom-card">
            <div className="loom-task-list">{filteredTasks.map((task) => renderTaskCard(task))}</div>
            {filteredTasks.length === 0 ? <p className="loom-muted p-4">{t("tasks.noneFound", "No tasks found.")}</p> : null}
          </section>
        ) : null}

        {!isPending && !error && displayMode === "board" ? (
          <section className="loom-task-board-scroll">
            <div className={`loom-task-board ${densityMode === "compact" ? "is-density-compact" : ""}`}>
            {boardStatuses().map((status) => {
              const tasks = boardColumns.get(status) ?? [];
              return (
                <article
                  key={status}
                  className={`loom-card p-3 ${dragOverStatus === status ? "is-drop-active" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverStatus(status);
                  }}
                  onDragLeave={() => setDragOverStatus((current) => (current === status ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleBoardDrop(status);
                  }}
                >
                  <div className="loom-row-between">
                    <h4 className="loom-section-title m-0">{statusLabel(status, t)}</h4>
                    <span className="loom-home-pill is-muted">{tasks.length}</span>
                  </div>
                  <div className="loom-stack-sm mt-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`loom-soft-row ${densityMode === "compact" ? "is-compact" : ""} ${draggingTaskId === task.id ? "is-dragging" : ""}`}
                        draggable
                        onDragStart={() => setDraggingTaskId(task.id)}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDragOverStatus(null);
                        }}
                      >
                        <div className="loom-row-between">
                          <button type="button" className="loom-task-title-button" onClick={() => setSelectedTaskId(task.id)}>
                            {task.title}
                          </button>
                        </div>
                        <p className="loom-task-meta m-0">{formatDue(task, t, dateLocale)}</p>
                        {renderLabelChips(task)}
                      </div>
                    ))}
                    {tasks.length === 0 ? <p className="loom-muted small m-0">{t("tasks.noneFound", "No tasks found.")}</p> : null}
                  </div>
                </article>
              );
            })}
            </div>
          </section>
        ) : null}

        {!isPending && !error && displayMode === "calendar" ? (
            <section className="loom-card p-4">
            <div className="loom-calendar-toolbar">
              <div className="loom-calendar-header">
                <button className="loom-calendar-nav" type="button" onClick={() => setCalendarMonth((value) => subMonths(value, 1))} aria-label={t("calendar.previousMonth", "Previous month")}>
                  ‹
                </button>
                <h3 className="loom-calendar-month">{format(calendarMonth, "MMMM yyyy", { locale: resolveDateFnsLocale(locale) })}</h3>
                <button className="loom-calendar-nav" type="button" onClick={() => setCalendarMonth((value) => addMonths(value, 1))} aria-label={t("calendar.nextMonth", "Next month")}>
                  ›
                </button>
              </div>

              <div className="loom-task-calendar-view-toggle" role="group" aria-label={t("tasks.calendarTaskView", "Task calendar view")}>
                <button
                  type="button"
                  className={calendarTaskView === "due" ? "is-active" : ""}
                  onClick={() => setCalendarTaskView("due")}
                >
                  {t("tasks.calendarDueView", "Due dates")}
                </button>
                <button
                  type="button"
                  className={calendarTaskView === "duration" ? "is-active" : ""}
                  onClick={() => setCalendarTaskView("duration")}
                >
                  {t("tasks.calendarDurationView", "Duration")}
                </button>
              </div>

              <label className="loom-task-calendar-color-field">
                <span>{t("tasks.calendarColorBy", "Color by")}</span>
                <select
                  className="loom-input"
                  value={calendarTaskColorBy}
                  onChange={(event) => setCalendarTaskColorBy(event.target.value as CalendarTaskColorBy)}
                >
                  <option value="label">{t("tasks.calendarColorByLabel", "Label")}</option>
                  <option value="status">{t("tasks.status", "Status")}</option>
                  <option value="priority">{t("tasks.priority", "Priority")}</option>
                  <option value="due_proximity">{t("tasks.calendarColorByDue", "Due date proximity")}</option>
                  {visibilityMode === "family" ? <option value="visibility">{t("common.visibility", "Visibility")}</option> : null}
                </select>
              </label>
            </div>

            <div className="loom-calendar-weekdays mt-3">
              {[t("calendar.mon", "Mon"), t("calendar.tue", "Tue"), t("calendar.wed", "Wed"), t("calendar.thu", "Thu"), t("calendar.fri", "Fri"), t("calendar.sat", "Sat"), t("calendar.sun", "Sun")].map(
                (weekday) => (
                  <span key={weekday}>{weekday}</span>
                )
              )}
            </div>

            <div className="loom-calendar-grid">
              {monthGridDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayTasks = dueTasksByDay.get(key) ?? [];
                const daySegments = calendarDurationLanesByDay.get(key) ?? [];
                const maxVisibleLanes = 3;
                const lanes = Array.from({ length: maxVisibleLanes }, (_, lane) => daySegments.find((segment) => segment.lane === lane) ?? null);
                const hiddenLaneCount = Math.max(0, daySegments.length - maxVisibleLanes);
                const hiddenTaskIds = daySegments.slice(maxVisibleLanes).map((segment) => segment.task.id);
                const isSelected = selectedCalendarDay ? isSameDay(selectedCalendarDay, day) : false;
                const hasItems = calendarTaskView === "duration" ? daySegments.length > 0 : dayTasks.length > 0;
                return (
                  <div
                    key={key}
                    className={`loom-calendar-day ${isSameMonth(day, calendarMonth) ? "" : "is-muted"} ${isSelected ? "is-selected" : ""} ${hasItems ? "is-has-items" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCalendarDay((current) => (current && isSameDay(current, day) ? null : day))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCalendarDay((current) => (current && isSameDay(current, day) ? null : day));
                      }
                    }}
                  >
                    <span className="loom-calendar-day-number">{format(day, "d")}</span>
                    {calendarTaskView === "duration" ? (
                      <span className="loom-calendar-ranges is-duration-view">
                        {lanes.map((segment, lane) =>
                          segment ? (
                            <span
                              key={`${segment.task.id}-${key}-${lane}`}
                              className={`loom-calendar-range-pill ${segment.isStart ? "is-start" : "is-continued-left"} ${segment.isEnd ? "is-end" : "is-continued-right"}`.trim()}
                              title={segment.task.title}
                              style={getCalendarTaskStyle(segment.task)}
                              onMouseEnter={(event) => showCalendarHoverCard(segment.task, event)}
                              onMouseLeave={() => hideCalendarHoverCard(segment.task.id)}
                            >
                              {segment.isStart ? segment.task.title : "\u00A0"}
                            </span>
                          ) : (
                            <span key={`empty-${key}-${lane}`} className="loom-calendar-range-slot" aria-hidden="true" />
                          )
                        )}
                        <span className="loom-calendar-range-more-slot">
                          {hiddenLaneCount > 0 ? (
                            <button
                              type="button"
                              className="loom-calendar-range-more"
                              onClick={(event) => event.stopPropagation()}
                              onMouseEnter={(event) => showCalendarOverflowCard(key, hiddenTaskIds, event)}
                              onMouseLeave={() => hideCalendarOverflowCard(key)}
                            >
                              +{hiddenLaneCount}
                            </button>
                          ) : null}
                        </span>
                      </span>
                    ) : (
                      <span className="loom-calendar-dots">
                        {dayTasks.slice(0, 3).map((task) => (
                          <span
                            key={`${task.id}-${key}`}
                            className="loom-calendar-dot is-task"
                            style={{ background: getCalendarTaskPalette(task).borderColor }}
                            onMouseEnter={(event) => showCalendarHoverCard(task, event)}
                            onMouseLeave={() => hideCalendarHoverCard(task.id)}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {calendarHoverCard ? (
              (() => {
                const hoveredTask = allTasks.find((task) => task.id === calendarHoverCard.taskId);
                if (!hoveredTask) return null;

                const hoveredAssignee = hoveredTask.assignedToUserId ? assigneeMap.get(hoveredTask.assignedToUserId) : null;
                return (
                  <div
                    className="loom-calendar-task-hover-card"
                    style={{ left: calendarHoverCard.left, top: calendarHoverCard.top }}
                    onMouseEnter={() => {
                      if (calendarHoverHideTimeoutRef.current) {
                        window.clearTimeout(calendarHoverHideTimeoutRef.current);
                        calendarHoverHideTimeoutRef.current = null;
                      }
                    }}
                    onMouseLeave={() => hideCalendarHoverCard()}
                  >
                    <div className="loom-row-between">
                      <strong>{hoveredTask.title}</strong>
                      <button
                        type="button"
                        className="loom-calendar-task-hover-edit"
                        aria-label={t("tasks.editTask", "Edit task")}
                        onClick={() => {
                          setSelectedTaskId(hoveredTask.id);
                          setCalendarHoverCard(null);
                        }}
                      >
                        ↗
                      </button>
                    </div>
                    <div className="loom-calendar-task-hover-grid">
                      <span>{statusLabel(hoveredTask.status, t)}</span>
                      <span>{formatDue(hoveredTask, t, dateLocale)}</span>
                      <span>{hoveredTask.priority === "high" ? t("tasks.priorityHigh", "High") : hoveredTask.priority === "medium" ? t("tasks.priorityMedium", "Medium") : t("tasks.priorityLow", "Low")}</span>
                      <span>{hoveredAssignee?.displayName ?? t("tasks.unassigned", "Unassigned")}</span>
                    </div>
                  </div>
                );
              })()
            ) : null}

            {calendarOverflowCard ? (
              (() => {
                const overflowTasks = calendarOverflowCard.taskIds
                  .map((taskId) => allTasks.find((task) => task.id === taskId) ?? null)
                  .filter((task): task is TaskRow => Boolean(task));

                if (overflowTasks.length === 0) return null;

                return (
                  <div
                    className="loom-calendar-overflow-card"
                    style={{ left: calendarOverflowCard.left, top: calendarOverflowCard.top }}
                    onMouseEnter={() => {
                      if (calendarOverflowHideTimeoutRef.current) {
                        window.clearTimeout(calendarOverflowHideTimeoutRef.current);
                        calendarOverflowHideTimeoutRef.current = null;
                      }
                    }}
                    onMouseLeave={() => hideCalendarOverflowCard()}
                  >
                    <table>
                      <tbody>
                        {overflowTasks.map((task) => (
                          <tr key={task.id}>
                            <td>
                              <span
                                className="loom-calendar-overflow-task"
                                style={getCalendarTaskStyle(task)}
                                onMouseEnter={(event) => showCalendarHoverCard(task, event)}
                                onMouseLeave={() => hideCalendarHoverCard(task.id)}
                              >
                                {task.title}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : null}

            {selectedCalendarDay ? (
              <div className="mt-4">
                <p className="loom-lists-group-title m-0">{format(selectedCalendarDay, "EEEE, MMM d", { locale: resolveDateFnsLocale(locale) })}</p>
                <div className="loom-task-list mt-2">
                  {selectedDayTasks.map((task) => renderTaskCard(task, true))}
                  {selectedDayTasks.length === 0 ? <p className="loom-muted">{t("tasks.noneFound", "No tasks found.")}</p> : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
      </div>

      {showQuickAdd ? (
        <div className="loom-quick-task-overlay" role="presentation">
          <button type="button" className="loom-quick-task-backdrop" aria-label={t("common.cancel", "Cancel")} onClick={closeQuickAdd} />
            <section className="loom-quick-task-modal" role="dialog" aria-modal="true" aria-label={t("tasks.quickAddTitle", "Quick add task")}>
              <div className="loom-quick-task-body">
                <label className="loom-field loom-quick-task-title-field">
                  <span>{t("tasks.quickTaskName", "Task name")}</span>
                  <input
                    className="loom-input loom-quick-task-title"
                    ref={quickTitleInputRef}
                    value={quickTitle}
                    onChange={(event) => {
                      setQuickTitle(event.target.value);
                      syncQuickShortcutFromInput(event.target);
                    }}
                    onClick={(event) => syncQuickShortcutFromInput(event.currentTarget)}
                    onSelect={(event) => syncQuickShortcutFromInput(event.currentTarget)}
                    onKeyDown={handleQuickTitleKeyDown}
                    placeholder={t("tasks.quickTaskNamePlaceholder", "Task name")}
                    autoFocus
                  />
                </label>
                {quickShortcutSession && quickShortcutAnchor ? (
                  <div
                    ref={quickShortcutPaletteRef}
                    className="loom-quick-shortcut-palette"
                    style={{ left: quickShortcutAnchor.left, top: quickShortcutAnchor.top }}
                    role="listbox"
                    aria-label={t("tasks.shortcutMenu", "Shortcut options")}
                  >
                    <div className="loom-quick-shortcut-header">
                      <span className="loom-home-pill is-muted">{quickShortcutSession.trigger}</span>
                      <span>{t("tasks.shortcutHint", "Use arrows plus Enter or Tab to pick")}</span>
                    </div>
                    {quickShortcutGroups.length > 0 ? (
                      quickShortcutGroups.map((group) => (
                        <div key={group.name} className="loom-quick-shortcut-group">
                          <p className="loom-quick-shortcut-group-title">{group.name}</p>
                          <div className="loom-quick-shortcut-options">
                            {group.options.map((option) => {
                              const absoluteIndex = quickShortcutOptions.findIndex((candidate) => candidate.id === option.id);
                              const isActive = absoluteIndex === quickShortcutActiveIndex;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  data-shortcut-option-index={absoluteIndex}
                                  className={`loom-quick-shortcut-option ${isActive ? "is-active" : ""} ${option.selected ? "is-selected" : ""}`.trim()}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => applyQuickShortcutOption(option)}
                                  role="option"
                                  aria-selected={option.selected}
                                >
                                  <span className="loom-quick-shortcut-option-main">
                                    <span className="loom-quick-shortcut-option-title">
                                      {option.color ? <i className="loom-quick-shortcut-option-dot" style={{ backgroundColor: option.color }} /> : null}
                                      {option.title}
                                    </span>
                                    {option.subtitle ? <span className="loom-quick-shortcut-option-subtitle">{option.subtitle}</span> : null}
                                  </span>
                                  {option.selected ? <span className="loom-quick-shortcut-option-check">✓</span> : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="loom-muted small m-0">{t("tasks.noMatchingOptions", "No matching options")}</p>
                    )}
                  </div>
                ) : null}

                <div className="loom-quick-shortcut-help">
                  <span>`#` {t("tasks.shortcutLabels", "labels")}</span>
                  <span>`@` {t("tasks.shortcutAssignees", "assignees")}</span>
                  <span>`/` {t("tasks.shortcutEverything", "everything")}</span>
                </div>

                <label className="loom-field mt-2">
                  <span>{t("common.description", "Description")}</span>
                <textarea
                  className="loom-input loom-textarea"
                  rows={3}
                  value={quickDescription}
                  onChange={(event) => setQuickDescription(event.target.value)}
                  placeholder={t("common.description", "Description")}
                />
              </label>

              <div className="loom-quick-task-controls mt-2">
                <label className="loom-field">
                  <span>{t("tasks.dueDate", "Due date")}</span>
                  <input className="loom-input" type="datetime-local" value={quickDueAtLocal} onChange={(event) => setQuickDueAtLocal(event.target.value)} />
                </label>
                <label className="loom-field">
                  <span>{t("tasks.priority", "Priority")}</span>
                  <select className="loom-input" value={quickPriority} onChange={(event) => setQuickPriority(event.target.value as "low" | "medium" | "high")}>
                    <option value="low">{t("tasks.priorityLow", "Low")}</option>
                    <option value="medium">{t("tasks.priorityMedium", "Medium")}</option>
                    <option value="high">{t("tasks.priorityHigh", "High")}</option>
                  </select>
                </label>
              </div>

              <div className="loom-quick-task-summary">
                <span className="loom-home-pill is-muted">
                  {t("tasks.assignee", "Assignee")}: {quickAssignee?.displayName ?? t("tasks.unassigned", "Unassigned")}
                </span>
                {quickDueAtLocal ? (
                  <span className="loom-home-pill is-muted">
                    {t("tasks.dueDate", "Due date")}: {new Date(new Date(quickDueAtLocal).getTime()).toLocaleString(dateLocale)}
                  </span>
                ) : null}
              </div>

              <div className="loom-field mt-2">
                <span>{t("tasks.labels", "Labels")}</span>
                <div className="loom-label-list mt-2">
                  {quickLabelIds.map((labelId) => {
                    const label = quickAddLabelOptions.find((option) => option.id === labelId);
                    if (!label) return null;
                    return (
                      <span key={label.id} className="loom-task-label-chip is-selected" style={{ borderColor: label.color }}>
                        <i style={{ backgroundColor: label.color }} />
                        {label.name}
                        <button
                          type="button"
                          className="loom-task-label-remove-btn"
                          aria-label={t("common.remove", "Remove")}
                          onClick={() => setQuickLabelIds((current) => current.filter((id) => id !== label.id))}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                  {quickLabelIds.length === 0 ? <p className="loom-muted small m-0">{t("tasks.shortcutLabelsEmpty", "Type # to add labels")}</p> : null}
                </div>
              </div>
            </div>

            <footer className="loom-quick-task-footer">
              <button type="button" className="loom-button-ghost" onClick={closeQuickAdd}>
                {t("common.cancel", "Cancel")}
              </button>
              <button type="button" className="loom-button-primary" onClick={() => void submitQuickAdd()} disabled={quickAddMutation.isPending}>
                {quickAddMutation.isPending ? t("common.saving", "Saving...") : t("tasks.quickAddAction", "Add task")}
              </button>
            </footer>
            {quickAddError ? <p className="loom-feedback-error m-0">{quickAddError}</p> : null}
          </section>
        </div>
      ) : null}

      <ResponsivePanel
        isOpen={Boolean(selectedTask)}
        title={selectedTask?.title ?? t("tasks.taskDetails", "Task details")}
        onClose={closeDrawer}
        size="wide"
        headerActions={
          <div className="loom-inline-actions">
            <button
              type="button"
              className="loom-button-primary"
              onClick={() => void saveDrawerTask()}
              disabled={!isDrawerDirty || drawerSaveMutation.isPending || !drawerDraft}
            >
              {drawerSaveMutation.isPending ? t("common.saving", "Saving...") : t("tasks.save", "Save task")}
            </button>
            <button type="button" className="loom-button-ghost" onClick={closeDrawer}>
              {t("common.close", "Close")}
            </button>
          </div>
        }
      >
        {selectedTask && drawerDraft ? (
          <div className="loom-task-drawer-layout">
            <div className="loom-task-drawer-main">
              {drawerSaveError ? <p className="loom-feedback-error m-0">{drawerSaveError}</p> : null}
              <section className="loom-card soft p-4">
                <label className="loom-field">
                  <span>{t("common.title", "Title")}</span>
                  <input
                    className="loom-input loom-task-drawer-title-input"
                    value={drawerDraft.title}
                    onChange={(event) => setDrawerDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                  />
                </label>
                <label className="loom-field mt-3">
                  <span>{t("common.description", "Description")}</span>
                  <textarea
                    className="loom-input loom-textarea loom-task-description-large"
                    rows={6}
                    value={drawerDraft.description}
                    onChange={(event) => setDrawerDraft((current) => (current ? { ...current, description: event.target.value } : current))}
                  />
                </label>
              </section>

              <section className="loom-card soft p-4">
                <div className="loom-row-between">
                  <h4 className="loom-section-title m-0">{t("tasks.comments", "Comments")}</h4>
                  <div className="loom-inline-actions">
                    <div className="loom-task-comment-sort-toggle" role="group" aria-label={t("tasks.commentsSort", "Comment sort")}>
                      <button
                        type="button"
                        className={commentsSort === "oldest" ? "is-active" : ""}
                        onClick={() => setCommentsSort("oldest")}
                      >
                        {t("tasks.commentsSortOldest", "Oldest first")}
                      </button>
                      <button
                        type="button"
                        className={commentsSort === "newest" ? "is-active" : ""}
                        onClick={() => setCommentsSort("newest")}
                      >
                        {t("tasks.commentsSortNewest", "Newest first")}
                      </button>
                    </div>
                    <span className="loom-home-pill is-muted">{selectedTaskCommentsQuery.data?.length ?? 0}</span>
                  </div>
                </div>

                <div className="loom-task-comments-list mt-3">
                  {selectedTaskCommentsQuery.isPending ? <p className="loom-muted m-0">{t("common.loading", "Loading...")}</p> : null}
                  {selectedTaskCommentsQuery.error ? <p className="loom-feedback-error m-0">{selectedTaskCommentsQuery.error.message}</p> : null}

                  {sortedComments.map((comment) => (
                    <article key={comment.id} className="loom-task-comment-item">
                      <span
                        className={`loom-task-assignee-avatar ${comment.authorAvatarUrl ? "has-image" : ""}`}
                        style={comment.authorAvatarUrl ? { backgroundImage: `url("${comment.authorAvatarUrl}")` } : undefined}
                        aria-hidden="true"
                      >
                        {comment.authorAvatarUrl ? null : getInitials(comment.authorName)}
                      </span>
                      <div className="loom-task-comment-body">
                        <p className="m-0 loom-task-comment-headline">
                          <span className="font-semibold">{comment.authorName}</span>
                          <span className="loom-muted small">{new Date(comment.createdAt).toLocaleString(dateLocale)}</span>
                        </p>
                        <p className="m-0 mt-2">{comment.body}</p>
                      </div>
                    </article>
                  ))}
                  {selectedTaskCommentsQuery.data && selectedTaskCommentsQuery.data.length === 0 ? (
                    <p className="loom-muted m-0">{t("tasks.noComments", "No comments yet.")}</p>
                  ) : null}
                </div>

                <form
                  className="loom-task-comment-form mt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!commentDraft.trim()) return;
                    commentMutation.mutate({ taskId: selectedTask.id, body: commentDraft.trim() });
                  }}
                >
                  <textarea
                    className="loom-input loom-textarea"
                    placeholder={t("tasks.commentPlaceholder", "Comment")}
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    rows={3}
                  />
                  <div className="loom-form-actions">
                    <button type="button" className="loom-button-ghost" onClick={() => setCommentDraft("")}>
                      {t("common.cancel", "Cancel")}
                    </button>
                    <button type="submit" className="loom-button-primary" disabled={commentMutation.isPending || commentDraft.trim().length === 0}>
                      {commentMutation.isPending ? t("common.saving", "Saving...") : t("tasks.addComment", "Comment")}
                    </button>
                  </div>
                  {commentMutation.error ? <p className="loom-feedback-error m-0">{commentMutation.error.message}</p> : null}
                </form>
              </section>
            </div>

            <aside className="loom-task-drawer-aside">
              <section className="loom-card soft p-4">
                <h4 className="loom-section-title m-0">{t("tasks.settings", "Task settings")}</h4>
                <div className="loom-task-editable-list mt-3">
                  <div className="loom-task-editable-item">
                    <span className="loom-muted small">{t("tasks.status", "Status")}</span>
                    <select
                      className={`loom-input loom-task-inline-control ${drawerEditor === "status" ? "is-editing" : ""}`}
                      value={drawerDraft.status}
                      onFocus={() => setDrawerEditor("status")}
                      onBlur={() => setDrawerEditor((value) => (value === "status" ? null : value))}
                      onChange={(event) =>
                        setDrawerDraft((current) =>
                          current ? { ...current, status: event.target.value as DrawerDraft["status"] } : current
                        )
                      }
                    >
                      {boardStatuses().map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status, t)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="loom-task-editable-item">
                    <span className="loom-muted small">{t("tasks.priority", "Priority")}</span>
                    <select
                      className={`loom-input loom-task-inline-control ${drawerEditor === "priority" ? "is-editing" : ""}`}
                      value={drawerDraft.priority}
                      onFocus={() => setDrawerEditor("priority")}
                      onBlur={() => setDrawerEditor((value) => (value === "priority" ? null : value))}
                      onChange={(event) =>
                        setDrawerDraft((current) =>
                          current ? { ...current, priority: event.target.value as DrawerDraft["priority"] } : current
                        )
                      }
                    >
                      <option value="low">{t("tasks.priorityLow", "Low")}</option>
                      <option value="medium">{t("tasks.priorityMedium", "Medium")}</option>
                      <option value="high">{t("tasks.priorityHigh", "High")}</option>
                    </select>
                  </div>

                  <div className="loom-task-editable-item">
                    <span className="loom-muted small">{t("tasks.startDate", "Start date")}</span>
                    <input
                      type="datetime-local"
                      className={`loom-input loom-task-inline-control ${drawerEditor === "startAt" ? "is-editing" : ""}`}
                      value={drawerDraft.startAtLocal}
                      onFocus={() => setDrawerEditor("startAt")}
                      onBlur={() => setDrawerEditor((value) => (value === "startAt" ? null : value))}
                      onChange={(event) => setDrawerDraft((current) => (current ? { ...current, startAtLocal: event.target.value } : current))}
                    />
                  </div>

                  <div className="loom-task-editable-item">
                    <span className="loom-muted small">{t("tasks.dueDate", "Due date")}</span>
                    <input
                      type="datetime-local"
                      className={`loom-input loom-task-inline-control ${drawerEditor === "dueAt" ? "is-editing" : ""}`}
                      value={drawerDraft.dueAtLocal}
                      onFocus={() => setDrawerEditor("dueAt")}
                      onBlur={() => setDrawerEditor((value) => (value === "dueAt" ? null : value))}
                        onChange={(event) => setDrawerDraft((current) => (current ? { ...current, dueAtLocal: event.target.value } : current))}
                      />
                  </div>

                  <div className="loom-task-editable-item">
                    <span className="loom-muted small">{t("tasks.closeDate", "Close date")}</span>
                    <input
                      type="datetime-local"
                      className="loom-input loom-task-inline-control"
                      value={selectedTask.status === "done" ? formatDateTimeLocal(selectedTask.updatedAt) : ""}
                      readOnly
                    />
                  </div>

                  <div className="loom-task-editable-item">
                    <span className="loom-muted small">{t("tasks.assignee", "Assignee")}</span>
                    <select
                      className={`loom-input loom-task-inline-control ${drawerEditor === "assignee" ? "is-editing" : ""}`}
                      value={drawerDraft.assignedToUserId}
                      onFocus={() => setDrawerEditor("assignee")}
                      onBlur={() => setDrawerEditor((value) => (value === "assignee" ? null : value))}
                      onChange={(event) => setDrawerDraft((current) => (current ? { ...current, assignedToUserId: event.target.value } : current))}
                    >
                      <option value="">{t("tasks.unassigned", "Unassigned")}</option>
                      {memberOptions.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="loom-task-editable-item">
                    <span className="loom-muted small">{t("common.visibility", "Visibility")}</span>
                    <select
                      className={`loom-input loom-task-inline-control ${drawerEditor === "visibility" ? "is-editing" : ""}`}
                      value={drawerDraft.visibility}
                      onFocus={() => setDrawerEditor("visibility")}
                      onBlur={() => setDrawerEditor((value) => (value === "visibility" ? null : value))}
                      onChange={(event) =>
                        setDrawerDraft((current) =>
                          current ? { ...current, visibility: event.target.value as DrawerDraft["visibility"] } : current
                        )
                      }
                    >
                      <option value="private">{t("visibility.private", "Private")}</option>
                      <option value="family">{t("visibility.family", "Family")}</option>
                      <option value="selected_members">{t("visibility.selected_members", "Selected members")}</option>
                    </select>
                  </div>

                  {drawerDraft.visibility === "selected_members" ? (
                    <div className="loom-task-editable-item">
                      <span className="loom-muted small">{t("common.selectMembers", "Select members")}</span>
                      <div className="loom-stack-sm mt-2">
                        {memberOptions.map((member) => {
                          const checked = drawerDraft.selectedMemberIds.includes(member.userId);
                          return (
                            <label key={member.userId} className="loom-checkbox-row">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setDrawerDraft((current) => {
                                    if (!current) return current;
                                    const set = new Set(current.selectedMemberIds);
                                    if (set.has(member.userId)) {
                                      set.delete(member.userId);
                                    } else {
                                      set.add(member.userId);
                                    }
                                    return { ...current, selectedMemberIds: Array.from(set) };
                                  })
                                }
                              />
                              <span>{member.displayName}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="loom-task-editable-item">
                    <div className="loom-row-between">
                      <span className="loom-muted small">{t("tasks.labels", "Labels")}</span>
                      <button type="button" className="loom-button-ghost loom-task-label-add-btn" onClick={() => setShowLabelPicker((value) => !value)}>
                        +
                      </button>
                    </div>
                    <div className="loom-label-list mt-2">
                      {drawerDraft.labelIds.map((labelId) => {
                        const label = drawerLabelOptions.find((option) => option.id === labelId);
                        if (!label) return null;
                        return (
                          <span key={label.id} className="loom-task-label-chip is-selected" style={{ borderColor: label.color }}>
                            <i style={{ backgroundColor: label.color }} />
                            {label.name}
                            <button
                              type="button"
                              className="loom-task-label-remove-btn"
                              aria-label={t("common.remove", "Remove")}
                              onClick={() =>
                                setDrawerDraft((current) =>
                                  current ? { ...current, labelIds: current.labelIds.filter((id) => id !== label.id) } : current
                                )
                              }
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    {showLabelPicker ? (
                      <div className="loom-label-list mt-2">
                        {drawerLabelOptions
                          .filter((label) => !drawerDraft.labelIds.includes(label.id))
                          .map((label) => (
                            <button
                              key={label.id}
                              type="button"
                              className="loom-task-label-chip"
                              onClick={() =>
                                setDrawerDraft((current) =>
                                  current ? { ...current, labelIds: [...current.labelIds, label.id] } : current
                                )
                              }
                              style={{ borderColor: label.color }}
                            >
                              <i style={{ backgroundColor: label.color }} />
                              {label.name}
                            </button>
                          ))}
                        {drawerLabelOptions.filter((label) => !drawerDraft.labelIds.includes(label.id)).length === 0 ? (
                          <p className="loom-muted small m-0">{t("tasks.noLabels", "No labels yet.")}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </ResponsivePanel>
    </div>
  );
}

