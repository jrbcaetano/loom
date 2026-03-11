"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
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
import { resolveDateFnsLocale } from "@/lib/date";

type EventRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string | null;
  visibility: "private" | "family" | "selected_members";
  createdByName: string | null;
  createdByAvatarUrl: string | null;
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

function parseDateOnly(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  return parsed;
}

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

function eventColorClass(event: EventRow) {
  if (event.visibility === "private") return "is-private";
  if (event.visibility === "selected_members") return "is-selected";
  return "is-family";
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "?";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function CalendarView({ events, tasks, selectedDate }: { events: EventRow[]; tasks: TaskRow[]; currentUserId: string; selectedDate?: string }) {
  const { t, locale } = useI18n();
  const dateFnsLocale = resolveDateFnsLocale(locale);
  const initialSelectedDay = parseDateOnly(selectedDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialSelectedDay ?? new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(initialSelectedDay);

  const monthGridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 })
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

  const groupedUpcomingEvents = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const upcoming = events
      .filter((event) => !isBefore(parseISO(event.endAt), todayStart))
      .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime())
      .slice(0, 10);

    return {
      today: upcoming.filter((event) => {
        const eventStart = parseISO(event.startAt);
        return eventStart >= todayStart && eventStart <= todayEnd;
      }),
      thisWeek: upcoming.filter((event) => {
        const eventStart = parseISO(event.startAt);
        return eventStart > todayEnd && eventStart <= thisWeekEnd;
      }),
      following: upcoming.filter((event) => parseISO(event.startAt) > thisWeekEnd)
    };
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) {
      return [] as EventRow[];
    }

    const dayStart = startOfDay(selectedDay);
    const dayEnd = endOfDay(selectedDay);

    return events
      .filter((event) => {
        const eventStart = parseISO(event.startAt);
        const eventEnd = parseISO(event.endAt);
        return eventStart <= dayEnd && eventEnd >= dayStart;
      })
      .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime());
  }, [events, selectedDay]);

  const hasUpcomingEvents = selectedDay
    ? selectedDayEvents.length > 0
    : groupedUpcomingEvents.today.length + groupedUpcomingEvents.thisWeek.length + groupedUpcomingEvents.following.length > 0;
  const upcomingSections: Array<{ label: string; events: EventRow[] }> = selectedDay
    ? [{ label: format(selectedDay, "EEEE, MMM d", { locale: dateFnsLocale }), events: selectedDayEvents }]
    : [
        { label: t("calendar.groupToday", "Today"), events: groupedUpcomingEvents.today },
        { label: t("calendar.groupThisWeek", "This Week"), events: groupedUpcomingEvents.thisWeek },
        { label: t("calendar.groupFollowing", "Following"), events: groupedUpcomingEvents.following }
      ];
  const addEventHref = selectedDay ? `/calendar/new?date=${format(selectedDay, "yyyy-MM-dd")}` : "/calendar/new";

  return (
    <div className="loom-calendar-figma">
      <div className="loom-calendar-header">
        <button className="loom-calendar-nav" type="button" onClick={() => setCurrentMonth((value) => subMonths(value, 1))} aria-label={t("calendar.previousMonth", "Previous month")}>
          ‹
        </button>
        <h3 className="loom-calendar-month">{format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale })}</h3>
        <button className="loom-calendar-nav" type="button" onClick={() => setCurrentMonth((value) => addMonths(value, 1))} aria-label={t("calendar.nextMonth", "Next month")}>
          ›
        </button>
      </div>

      <div className="loom-calendar-layout">
        <section className="loom-card p-4">
          <div className="loom-calendar-weekdays">
            {[t("calendar.mon", "Mon"), t("calendar.tue", "Tue"), t("calendar.wed", "Wed"), t("calendar.thu", "Thu"), t("calendar.fri", "Fri"), t("calendar.sat", "Sat"), t("calendar.sun", "Sun")].map(
              (weekday) => (
                <span key={weekday}>{weekday}</span>
              )
            )}
          </div>

          <div className="loom-calendar-grid">
            {itemsByDay.map(({ day, items: dayItems }) => {
              const isCurrent = isSameMonth(day, currentMonth);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`loom-calendar-day ${isCurrent ? "" : "is-muted"} ${isSelected ? "is-selected" : ""} ${isToday(day) ? "is-today" : ""} ${dayItems.length > 0 ? "is-has-items" : ""}`}
                  onClick={() => setSelectedDay((current) => (current && isSameDay(current, day) ? null : day))}
                >
                  <span className="loom-calendar-day-number">{format(day, "d", { locale: dateFnsLocale })}</span>
                  <span className="loom-calendar-dots">
                    {dayItems.slice(0, 3).map((item) => (
                      <span key={`${item.kind}-${item.id}-${format(day, "yyyy-MM-dd", { locale: dateFnsLocale })}`} className={`loom-calendar-dot ${itemColorClass(item)}`} />
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
              {hasUpcomingEvents ? null : <p className="loom-muted">{t("calendar.noUpcomingItems", "No upcoming items.")}</p>}
              {upcomingSections.map((section) => (
                <div key={section.label} className="loom-stack-sm">
                  {section.events.length > 0 ? <p className="loom-lists-group-title">{section.label}</p> : null}
                  {section.events.map((event) => {
                    const eventStart = parseISO(event.startAt);
                    const creatorName = event.createdByName ?? t("common.unknown", "Unknown");
                    const hasCreatorAvatar = Boolean(event.createdByAvatarUrl);
                    return (
                      <Link key={event.id} href={`/calendar/${event.id}`} className="loom-calendar-upcoming-row loom-calendar-upcoming-link">
                        <span className={`loom-calendar-stripe ${eventColorClass(event)}`} />
                        <div className="loom-row-between">
                          <div>
                            <p className="m-0 font-semibold">{event.title}</p>
                            <p className="loom-muted small m-0">
                              {isSameDay(eventStart, new Date()) ? t("calendar.today", "Today") : format(eventStart, "EEE, MMM d", { locale: dateFnsLocale })} - {" "}
                              {format(eventStart, "p", { locale: dateFnsLocale })}
                            </p>
                          </div>
                          <span
                            className={`loom-calendar-event-avatar ${hasCreatorAvatar ? "has-image" : ""}`}
                            style={hasCreatorAvatar ? { backgroundImage: `url(${event.createdByAvatarUrl})` } : undefined}
                            title={creatorName}
                            aria-label={creatorName}
                          >
                            {hasCreatorAvatar ? null : getInitials(creatorName)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <a className="loom-button-primary loom-calendar-add" href={addEventHref} aria-label={t("calendar.createTitle", "Create event")}>
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
