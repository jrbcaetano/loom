"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";

type EventRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string | null;
  visibility: "private" | "family" | "selected_members";
};

type TaskRow = {
  id: string;
  title: string;
  startAt: string | null;
  dueAt: string | null;
  visibility: "private" | "family" | "selected_members";
  assignedToUserId: string | null;
  status: "todo" | "doing" | "done";
};

type CalendarItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  visibility: "private" | "family" | "selected_members";
  kind: "event" | "task";
  assignedToUserId?: string | null;
  status?: "todo" | "doing" | "done";
  location?: string | null;
};

function occursOnDay(item: CalendarItem, day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  const start = new Date(item.startAt);
  const end = new Date(item.endAt);
  return start <= dayEnd && end >= dayStart;
}

function visibilityClass(value: CalendarItem["visibility"]) {
  if (value === "private") return "is-private";
  if (value === "family") return "is-family";
  return "is-selected_members";
}

export function CalendarView({ events, tasks, currentUserId }: { events: EventRow[]; tasks: TaskRow[]; currentUserId: string }) {
  const [mode, setMode] = useState<"agenda" | "month">("agenda");
  const [showEvents, setShowEvents] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const now = new Date();

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 })
    });
  }, [now]);

  const items = useMemo<CalendarItem[]>(() => {
    const eventItems: CalendarItem[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      visibility: event.visibility,
      kind: "event",
      location: event.location
    }));

    const taskItems: CalendarItem[] = tasks
      .filter((task) => task.status !== "done")
      .filter((task) => (myTasksOnly ? task.assignedToUserId === currentUserId : true))
      .filter((task) => task.startAt || task.dueAt)
      .map((task) => ({
        id: task.id,
        title: task.title,
        startAt: task.startAt ?? task.dueAt!,
        endAt: task.dueAt ?? task.startAt!,
        visibility: task.visibility,
        kind: "task",
        assignedToUserId: task.assignedToUserId,
        status: task.status
      }));

    return [...(showEvents ? eventItems : []), ...(showTasks ? taskItems : [])];
  }, [events, tasks, showEvents, showTasks, myTasksOnly, currentUserId]);

  const agendaItems = useMemo(() => {
    const until = addDays(now, 30);
    return items.filter((item) => new Date(item.endAt) >= now && new Date(item.startAt) <= until).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [items, now]);

  return (
    <div className="loom-stack">
      <div className="loom-form-inline">
        <button className={`loom-button-ghost ${mode === "agenda" ? "is-selected" : ""}`} type="button" onClick={() => setMode("agenda")}>
          Agenda
        </button>
        <button className={`loom-button-ghost ${mode === "month" ? "is-selected" : ""}`} type="button" onClick={() => setMode("month")}>
          Month
        </button>
        <label className="loom-checkbox-row">
          <input type="checkbox" checked={showEvents} onChange={(event) => setShowEvents(event.target.checked)} />
          <span>Events</span>
        </label>
        <label className="loom-checkbox-row">
          <input type="checkbox" checked={showTasks} onChange={(event) => setShowTasks(event.target.checked)} />
          <span>Tasks</span>
        </label>
        <label className="loom-checkbox-row">
          <input type="checkbox" checked={myTasksOnly} onChange={(event) => setMyTasksOnly(event.target.checked)} />
          <span>My tasks only</span>
        </label>
      </div>

      {mode === "agenda" ? (
        <div className="loom-stack-sm">
          {agendaItems.length === 0 ? <p className="loom-muted">No upcoming items.</p> : null}
          {agendaItems.map((item) => (
            <article key={`${item.kind}-${item.id}`} className="loom-card p-4">
              <div className="loom-row-between">
                <p className="m-0 font-semibold">{item.title}</p>
                <div className="loom-stack-xs">
                  <span className={`loom-calendar-tag ${item.kind === "task" ? "is-task" : "is-event"}`}>{item.kind}</span>
                  <span className={`loom-calendar-tag ${visibilityClass(item.visibility)}`}>{item.visibility.replace("_", " ")}</span>
                </div>
              </div>
              <p className="loom-muted small mt-1">
                {new Date(item.startAt).toLocaleString()} - {new Date(item.endAt).toLocaleString()}
              </p>
              {item.kind === "event" && item.location ? <p className="loom-muted small mt-1">{item.location}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="loom-month-grid">
          {monthGridDays.map((day) => {
            const dayItems = items.filter((item) => occursOnDay(item, day));
            return (
              <div key={day.toISOString()} className={`loom-month-cell ${isSameMonth(day, now) ? "" : "is-muted"}`}>
                <p className="loom-month-day">{format(day, "d")}</p>
                <div className="loom-stack-xs">
                  {dayItems.slice(0, 3).map((item) => (
                    <p key={`${item.kind}-${item.id}-${format(day, "yyyy-MM-dd")}`} className={`loom-month-event ${item.kind === "task" ? "is-task" : "is-event"} ${visibilityClass(item.visibility)}`}>
                      {item.kind === "task" ? "T" : "E"} {item.title}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
