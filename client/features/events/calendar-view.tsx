"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { useI18n } from "@/lib/i18n/context";

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

function itemColorClass(item: CalendarItem) {
  if (item.visibility === "private") return "is-private";
  if (item.visibility === "selected_members") return "is-selected";
  return item.kind === "task" ? "is-task" : "is-family";
}

function itemAvatar(item: CalendarItem) {
  if (item.kind === "task") return "\uD83D\uDC66";
  if (item.visibility === "private") return "\uD83D\uDC69";
  if (item.visibility === "selected_members") return "\uD83D\uDC67";
  return "\uD83D\uDC68";
}

export function CalendarView({ events, tasks }: { events: EventRow[]; tasks: TaskRow[]; currentUserId: string }) {
  const { t } = useI18n();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 })
    });
  }, [currentMonth]);

  const items = useMemo<CalendarItem[]>(() => {
    const eventItems: CalendarItem[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      visibility: event.visibility,
      kind: "event"
    }));

    const taskItems: CalendarItem[] = tasks
      .filter((task) => task.status !== "done")
      .filter((task) => task.startAt || task.dueAt)
      .map((task) => ({
        id: task.id,
        title: task.title,
        startAt: task.startAt ?? task.dueAt!,
        endAt: task.dueAt ?? task.startAt!,
        visibility: task.visibility,
        kind: "task",
        assignedToUserId: task.assignedToUserId
      }));

    return [...eventItems, ...taskItems];
  }, [events, tasks]);

  const itemsByDay = useMemo(
    () =>
      monthGridDays.map((day) => ({
        day,
        items: items.filter((item) => occursOnDay(item, day))
      })),
    [items, monthGridDays]
  );

  const upcomingItems = useMemo(() => {
    const start = startOfDay(selectedDay);
    return items
      .filter((item) => !isBefore(parseISO(item.endAt), start))
      .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime())
      .slice(0, 6);
  }, [items, selectedDay]);

  return (
    <div className="loom-calendar-figma">
      <div className="loom-calendar-header">
        <button className="loom-calendar-nav" type="button" onClick={() => setCurrentMonth((value) => subMonths(value, 1))} aria-label={t("calendar.previousMonth", "Previous month")}>
          ‹
        </button>
        <h3 className="loom-calendar-month">{format(currentMonth, "MMMM yyyy")}</h3>
        <button className="loom-calendar-nav" type="button" onClick={() => setCurrentMonth((value) => addMonths(value, 1))} aria-label={t("calendar.nextMonth", "Next month")}>
          ›
        </button>
      </div>

      <div className="loom-calendar-layout">
        <section className="loom-card p-4">
          <div className="loom-calendar-weekdays">
            {[t("calendar.sun", "Sun"), t("calendar.mon", "Mon"), t("calendar.tue", "Tue"), t("calendar.wed", "Wed"), t("calendar.thu", "Thu"), t("calendar.fri", "Fri"), t("calendar.sat", "Sat")].map(
              (weekday) => (
                <span key={weekday}>{weekday}</span>
              )
            )}
          </div>

          <div className="loom-calendar-grid">
            {itemsByDay.map(({ day, items: dayItems }) => {
              const isCurrent = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`loom-calendar-day ${isCurrent ? "" : "is-muted"} ${isSelected ? "is-selected" : ""} ${isToday(day) ? "is-today" : ""} ${dayItems.length > 0 ? "is-has-items" : ""}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="loom-calendar-day-number">{format(day, "d")}</span>
                  <span className="loom-calendar-dots">
                    {dayItems.slice(0, 3).map((item) => (
                      <span key={`${item.kind}-${item.id}-${format(day, "yyyy-MM-dd")}`} className={`loom-calendar-dot ${itemColorClass(item)}`} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="loom-calendar-side">
          <section className="loom-card p-4">
            <h4 className="loom-section-title">{t("home.upcomingEvents", "Upcoming events")}</h4>
            <div className="loom-stack-sm mt-3">
              {upcomingItems.length === 0 ? <p className="loom-muted">{t("calendar.noUpcomingItems", "No upcoming items.")}</p> : null}
              {upcomingItems.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="loom-calendar-upcoming-row">
                  <span className={`loom-calendar-stripe ${itemColorClass(item)}`} />
                  <div className="loom-row-between">
                    <div>
                      <p className="m-0 font-semibold">{item.title}</p>
                      <p className="loom-muted small m-0">
                        {isSameDay(parseISO(item.startAt), selectedDay) ? t("calendar.today", "Today") : format(parseISO(item.startAt), "MMM d")} - {format(parseISO(item.startAt), "h:mm a")}
                      </p>
                    </div>
                    <span>{itemAvatar(item)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <a className="loom-button-primary loom-calendar-add" href="/calendar/new" aria-label={t("calendar.createTitle", "Create event")}>
            + {t("calendar.addEvent", "Add Event")}
          </a>
        </aside>
      </div>

      <section className="loom-card p-3">
        <div className="loom-calendar-legend">
          <span>
            <i className="loom-calendar-dot is-family" /> {t("visibility.family", "Family")}
          </span>
          <span>
            <i className="loom-calendar-dot is-task" /> {t("nav.tasks", "Tasks")}
          </span>
          <span>
            <i className="loom-calendar-dot is-selected" /> {t("visibility.selected_members", "Selected members")}
          </span>
          <span>
            <i className="loom-calendar-dot is-private" /> {t("visibility.private", "Private")}
          </span>
        </div>
      </section>
    </div>
  );
}
