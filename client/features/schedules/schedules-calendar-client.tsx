"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { useRouter } from "next/navigation";
import { resolveDateFnsLocale } from "@/lib/date";
import { useI18n } from "@/lib/i18n/context";
import { ResponsivePanel } from "@/components/common/responsive-panel";
import { expandScheduleOccurrences, expandSchedulesForFamily } from "@/features/schedules/occurrences";
import { ScheduleExceptionsManager } from "@/features/schedules/schedule-exceptions-manager";
import { ScheduleForm } from "@/features/schedules/schedule-form";
import type { ScheduleOccurrence, ScheduleSeriesRow, ScheduleTemplateRow } from "@/features/schedules/model";

type ViewMode = "month" | "week" | "list";

type FamilyMemberOption = {
  id: string;
  displayName: string;
  role: "admin" | "adult" | "child";
};

type CalendarOccurrence = ScheduleOccurrence & {
  startAt: Date;
  endAt: Date;
};

type MonthBar = {
  occurrence: CalendarOccurrence;
  lane: number;
  startColumn: number;
  spanColumns: number;
  startsThisWeek: boolean;
  endsThisWeek: boolean;
};

type WeekSegment = {
  occurrence: CalendarOccurrence;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  lane: number;
  laneCount: number;
};

type ScheduleHoverCard = {
  occurrence: CalendarOccurrence;
  left: number;
  top: number;
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const HOUR_HEIGHT = 56;

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesFromDayStart(value: Date, dayStart: Date, dayEnd: Date) {
  if (value.getTime() <= dayStart.getTime()) return 0;
  if (value.getTime() >= dayEnd.getTime()) return 24 * 60;
  return value.getHours() * 60 + value.getMinutes();
}

function buildOccurrenceDates(occurrence: ScheduleOccurrence): CalendarOccurrence {
  const date = parseDateOnly(occurrence.occurrenceDate) ?? new Date();
  const [startHours, startMinutes] = occurrence.startsAtLocal.split(":").map((value) => Number.parseInt(value, 10));
  const [endHours, endMinutes] = occurrence.endsAtLocal.split(":").map((value) => Number.parseInt(value, 10));
  const startAt = new Date(date);
  startAt.setHours(startHours, startMinutes, 0, 0);
  const endAt = new Date(date);
  endAt.setHours(endHours, endMinutes, 0, 0);
  if (occurrence.spansNextDay || endAt.getTime() <= startAt.getTime()) {
    endAt.setDate(endAt.getDate() + 1);
  }
  return { ...occurrence, startAt, endAt };
}

function categoryClass(category: CalendarOccurrence["category"]) {
  if (category === "work") return "is-work";
  if (category === "school") return "is-school";
  if (category === "sport") return "is-sport";
  return "is-custom";
}

function hexToRgb(color: string) {
  const normalized = color.replace("#", "");
  if (normalized.length !== 6) return null;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  if ([red, green, blue].some((value) => Number.isNaN(value))) return null;
  return { red, green, blue };
}

function readableTextColor(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return "#ffffff";
  const luminance = (rgb.red * 299 + rgb.green * 587 + rgb.blue * 114) / 1000;
  return luminance > 150 ? "#19202c" : "#ffffff";
}

function scheduleSurfaceStyle(color: string) {
  return {
    backgroundColor: color,
    color: readableTextColor(color)
  };
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function buildMonthBars(occurrences: CalendarOccurrence[], weekStart: Date, weekEnd: Date) {
  const bars = occurrences
    .filter((occurrence) => occurrence.endAt > weekStart && occurrence.startAt < addDays(weekEnd, 1))
    .map((occurrence) => {
      const clippedStart = occurrence.startAt < weekStart ? weekStart : occurrence.startAt;
      const clippedEnd = occurrence.endAt > addDays(weekEnd, 1) ? addDays(weekEnd, 1) : occurrence.endAt;
      const startColumn = Math.floor((startOfDay(clippedStart).getTime() - weekStart.getTime()) / 86_400_000) + 1;
      const endColumn = Math.floor((startOfDay(new Date(clippedEnd.getTime() - 1)).getTime() - weekStart.getTime()) / 86_400_000) + 1;
      return {
        occurrence,
        lane: 0,
        startColumn,
        spanColumns: endColumn - startColumn + 1,
        startsThisWeek: occurrence.startAt >= weekStart,
        endsThisWeek: occurrence.endAt <= addDays(weekEnd, 1)
      };
    })
    .sort((left, right) => left.startColumn - right.startColumn || right.spanColumns - left.spanColumns || left.occurrence.startAt.getTime() - right.occurrence.startAt.getTime());

  const lanes: MonthBar[][] = [];
  for (const bar of bars) {
    const endColumn = bar.startColumn + bar.spanColumns - 1;
    let lane = 0;
    while (true) {
      const laneItems = lanes[lane] ?? [];
      const conflict = laneItems.some((item) => {
        const itemEnd = item.startColumn + item.spanColumns - 1;
        return item.startColumn <= endColumn && itemEnd >= bar.startColumn;
      });
      if (!conflict) {
        bar.lane = lane;
        laneItems.push(bar);
        lanes[lane] = laneItems;
        break;
      }
      lane += 1;
    }
  }

  return { bars, laneCount: Math.max(1, lanes.length) };
}

function buildWeekSegments(occurrences: CalendarOccurrence[], weekDays: Date[]) {
  return weekDays.map((day, dayIndex) => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    const segments = occurrences
      .filter((occurrence) => occurrence.endAt > dayStart && occurrence.startAt < dayEnd)
      .map((occurrence) => {
        const start = occurrence.startAt > dayStart ? occurrence.startAt : dayStart;
        const end = occurrence.endAt < dayEnd ? occurrence.endAt : dayEnd;
        const startMinutes = minutesFromDayStart(start, dayStart, dayEnd);
        const endMinutes = minutesFromDayStart(end, dayStart, dayEnd);
        return {
          occurrence,
          dayIndex,
          startMinutes,
          endMinutes: Math.max(startMinutes + 30, endMinutes),
          lane: 0,
          laneCount: 1
        };
      })
      .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);

    const active: Array<{ lane: number; endMinutes: number }> = [];
    let maxLanes = 1;
    for (const segment of segments) {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (active[index].endMinutes <= segment.startMinutes) {
          active.splice(index, 1);
        }
      }
      let lane = 0;
      while (active.some((entry) => entry.lane === lane)) {
        lane += 1;
      }
      segment.lane = lane;
      active.push({ lane, endMinutes: segment.endMinutes });
      maxLanes = Math.max(maxLanes, active.length);
    }

    return segments.map((segment) => ({
      ...segment,
      laneCount: maxLanes
    }));
  });
}

export function SchedulesCalendarClient({
  familyId,
  familyMembers,
  templates,
  initialSchedules
}: {
  familyId: string;
  familyMembers: FamilyMemberOption[];
  templates: ScheduleTemplateRow[];
  initialSchedules: ScheduleSeriesRow[];
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const dateFnsLocale = resolveDateFnsLocale(locale);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [monthAnchor, setMonthAnchor] = useState(startOfMonth(new Date()));
  const [weekAnchor, setWeekAnchor] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedMonthDay, setSelectedMonthDay] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [drawerSaveState, setDrawerSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [drawerSaveError, setDrawerSaveError] = useState<string | null>(null);
  const [scheduleHoverCard, setScheduleHoverCard] = useState<ScheduleHoverCard | null>(null);
  const scheduleHoverHideTimeoutRef = useRef<number | null>(null);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const displayMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  useEffect(() => {
    if (!showDisplayMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (displayMenuRef.current?.contains(event.target)) {
        return;
      }

      setShowDisplayMenu(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [showDisplayMenu]);

  const selectedSchedule = useMemo(() => schedules.find((schedule) => schedule.id === editingScheduleId) ?? null, [editingScheduleId, schedules]);

  const upcomingBySchedule = useMemo(() => {
    const now = new Date();
    const rangeEnd = addDays(now, 60);
    return new Map(schedules.map((schedule) => [schedule.id, expandScheduleOccurrences(schedule, now, rangeEnd)[0] ?? null]));
  }, [schedules]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(monthAnchor);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 })
    });
  }, [monthAnchor]);

  const monthWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let index = 0; index < monthDays.length; index += 7) {
      weeks.push(monthDays.slice(index, index + 7));
    }
    return weeks;
  }, [monthDays]);

  const monthOccurrences = useMemo(
    () => expandSchedulesForFamily(schedules, monthDays[0] ?? new Date(), monthDays[monthDays.length - 1] ?? new Date()).map(buildOccurrenceDates),
    [monthDays, schedules]
  );
  const monthOccurrencesByDay = useMemo(
    () =>
      monthDays.map((day) => ({
        day,
        occurrences: monthOccurrences
          .filter((occurrence) => occurrence.endAt > startOfDay(day) && occurrence.startAt < addDays(startOfDay(day), 1))
          .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
      })),
    [monthDays, monthOccurrences]
  );
  const selectedMonthOccurrences = useMemo(() => {
    if (!selectedMonthDay) {
      return [] as CalendarOccurrence[];
    }

    return monthOccurrences
      .filter((occurrence) => occurrence.endAt > startOfDay(selectedMonthDay) && occurrence.startAt < addDays(startOfDay(selectedMonthDay), 1))
      .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  }, [monthOccurrences, selectedMonthDay]);

  const weekDays = useMemo(() => eachDayOfInterval({ start: weekAnchor, end: addDays(weekAnchor, 6) }), [weekAnchor]);
  const weekOccurrences = useMemo(
    () => expandSchedulesForFamily(schedules, weekDays[0] ?? new Date(), weekDays[weekDays.length - 1] ?? new Date()).map(buildOccurrenceDates),
    [schedules, weekDays]
  );
  const weekSegments = useMemo(() => buildWeekSegments(weekOccurrences, weekDays), [weekDays, weekOccurrences]);

  async function archiveSchedule() {
    if (!selectedSchedule) return;
    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) return;
    setDeleteError(null);
    setIsDeleting(true);
    const response = await fetch(`/api/schedules/${selectedSchedule.id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setDeleteError(payload?.error ?? t("common.deleteError", "Failed to delete"));
      setIsDeleting(false);
      return;
    }
    setIsDeleting(false);
    setEditingScheduleId(null);
    router.refresh();
  }

  function closePanels() {
    setIsCreateOpen(false);
    setEditingScheduleId(null);
    setDeleteError(null);
    setDrawerSaveState("idle");
    setDrawerSaveError(null);
    setScheduleHoverCard(null);
  }

  function showScheduleHoverCard(occurrence: CalendarOccurrence, event: ReactMouseEvent<HTMLElement>) {
    if (scheduleHoverHideTimeoutRef.current) {
      window.clearTimeout(scheduleHoverHideTimeoutRef.current);
      scheduleHoverHideTimeoutRef.current = null;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setScheduleHoverCard({
      occurrence,
      left: rect.left + rect.width / 2,
      top: rect.top - 10
    });
  }

  function hideScheduleHoverCard(scheduleId?: string) {
    if (scheduleHoverHideTimeoutRef.current) {
      window.clearTimeout(scheduleHoverHideTimeoutRef.current);
    }

    scheduleHoverHideTimeoutRef.current = window.setTimeout(() => {
      setScheduleHoverCard((current) => {
        if (!current) return null;
        if (scheduleId && current.occurrence.sourceScheduleId !== scheduleId) {
          return current;
        }
        return null;
      });
      scheduleHoverHideTimeoutRef.current = null;
    }, 120);
  }

  return (
    <div className="loom-stack-sm">
      <section className="loom-module-header loom-schedules-header">
        <div className="loom-row-between loom-schedules-header-row">
          <div className="loom-module-header-copy">
            <h2 className="loom-module-title">{t("nav.schedules", "Schedules")}</h2>
            <p className="loom-module-subtitle">
              {t(
                "schedules.subtitle",
                "Plan repeating work, school, and activity patterns for each family member, then share the day-to-day view with the whole family."
              )}
            </p>
          </div>
          <div className="loom-inline-actions loom-schedules-header-actions">
            <div className="loom-task-popup-anchor" ref={displayMenuRef}>
              <button
                type="button"
                className="loom-task-icon-button"
                aria-label={t("tasks.displaySettings", "Display settings")}
                onClick={() => setShowDisplayMenu((value) => !value)}
              >
                ⊞
              </button>
              {showDisplayMenu ? (
                <div className="loom-task-popup">
                  <p className="loom-task-popup-title">{t("tasks.layout", "Layout")}</p>
                  <button type="button" className="loom-task-popup-option" onClick={() => { setViewMode("month"); setShowDisplayMenu(false); }}>
                    <span>{t("calendar.month", "Month")}</span>
                    <span>{viewMode === "month" ? "✓" : ""}</span>
                  </button>
                  <button type="button" className="loom-task-popup-option" onClick={() => { setViewMode("week"); setShowDisplayMenu(false); }}>
                    <span>{t("calendar.thisWeek", "Week")}</span>
                    <span>{viewMode === "week" ? "✓" : ""}</span>
                  </button>
                  <button type="button" className="loom-task-popup-option" onClick={() => { setViewMode("list"); setShowDisplayMenu(false); }}>
                    <span>{t("common.list", "List")}</span>
                    <span>{viewMode === "list" ? "✓" : ""}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="loom-task-create-plus" aria-label={t("schedules.new", "New schedule")} onClick={() => setIsCreateOpen(true)}>
              +
            </button>
          </div>
        </div>
      </section>

      {viewMode === "list" ? (
        <section className="loom-card p-5">
          <div className="loom-stack-sm">
            {schedules.length === 0 ? <p className="loom-muted">{t("schedules.empty", "No schedules created yet.")}</p> : null}
            {schedules.map((schedule) => {
              const upcoming = upcomingBySchedule.get(schedule.id);
              return (
                <button key={schedule.id} type="button" className="loom-conversation-row" onClick={() => setEditingScheduleId(schedule.id)}>
                  <div>
                    <p className="m-0 font-semibold">
                      <span className="loom-schedule-inline-dot" style={{ backgroundColor: schedule.color }} />
                      {schedule.title}
                    </p>
                    <p className="loom-entity-meta">
                      {schedule.familyMemberName} · {t(`schedules.categoryLabel.${schedule.category}`, schedule.category)} · {schedule.blocks.length} {t("schedules.blocksLabel", "blocks")}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 small">{schedule.startsOn}{schedule.endsOn ? ` - ${schedule.endsOn}` : ""}</p>
                    <p className="loom-muted small m-0">
                      {upcoming ? `${format(new Date(`${upcoming.occurrenceDate}T12:00:00`), "EEE, MMM d", { locale: dateFnsLocale })} · ${upcoming.startsAtLocal.slice(0, 5)}` : t("schedules.noUpcomingForSchedule", "No upcoming blocks")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {viewMode === "month" ? (
        <div className="loom-calendar-figma loom-schedules-month-figma">
          <div className="loom-calendar-layout">
            <section className="loom-card p-4">
              <div className="loom-schedules-calendar-toolbar">
                <div className="loom-inline-actions">
                  <button className="loom-calendar-nav" type="button" onClick={() => setMonthAnchor((current) => subMonths(current, 1))} aria-label={t("calendar.previousMonth", "Previous month")}>
                    ‹
                  </button>
                  <h3 className="loom-calendar-month">{format(monthAnchor, "MMMM yyyy", { locale: dateFnsLocale })}</h3>
                  <button className="loom-calendar-nav" type="button" onClick={() => setMonthAnchor((current) => addMonths(current, 1))} aria-label={t("calendar.nextMonth", "Next month")}>
                    ›
                  </button>
                  <button
                    type="button"
                    className="loom-button-ghost"
                    onClick={() => {
                      const today = new Date();
                      setMonthAnchor(startOfMonth(today));
                      setSelectedMonthDay(today);
                    }}
                  >
                    {t("calendar.today", "Today")}
                  </button>
                </div>
              </div>

              <div className="loom-calendar-weekdays">
                {[t("calendar.mon", "Mon"), t("calendar.tue", "Tue"), t("calendar.wed", "Wed"), t("calendar.thu", "Thu"), t("calendar.fri", "Fri"), t("calendar.sat", "Sat"), t("calendar.sun", "Sun")].map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="loom-schedules-month-grid">
                {monthWeeks.map((week, weekIndex) => {
                  const weekStart = startOfDay(week[0] ?? new Date());
                  const weekEnd = startOfDay(week[6] ?? new Date());
                  const { bars, laneCount } = buildMonthBars(monthOccurrences, weekStart, weekEnd);

                  return (
                    <section key={`${weekIndex}-${weekStart.toISOString()}`} className="loom-schedules-month-row" style={{ ["--loom-schedule-lanes" as string]: String(laneCount) }}>
                      <div className="loom-schedules-month-cells">
                        {week.map((day) => {
                          const dayOccurrences = monthOccurrencesByDay.find((entry) => isSameDay(entry.day, day))?.occurrences ?? [];
                          const isSelected = selectedMonthDay ? isSameDay(day, selectedMonthDay) : false;
                          return (
                            <button
                              key={day.toISOString()}
                              type="button"
                              className={`loom-schedules-month-cell ${isSameMonth(day, monthAnchor) ? "" : "is-outside"} ${isSelected ? "is-selected" : ""} ${isToday(day) ? "is-today" : ""} ${dayOccurrences.length > 0 ? "is-has-items" : ""}`.trim()}
                              onClick={() => setSelectedMonthDay((current) => (current && isSameDay(current, day) ? null : day))}
                            >
                              <div className="loom-schedules-month-date">{format(day, "d", { locale: dateFnsLocale })}</div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="loom-schedules-month-bars">
                        {bars.map((bar) => (
                          <button
                            key={bar.occurrence.id}
                            type="button"
                            className={`loom-schedules-month-bar ${categoryClass(bar.occurrence.category)} ${!bar.startsThisWeek ? "is-continued-left" : ""} ${!bar.endsThisWeek ? "is-continued-right" : ""}`.trim()}
                            style={{ gridColumn: `${bar.startColumn} / span ${bar.spanColumns}`, gridRow: `${bar.lane + 1}`, ...scheduleSurfaceStyle(bar.occurrence.color) }}
                            onMouseEnter={(event) => showScheduleHoverCard(bar.occurrence, event)}
                            onMouseLeave={() => hideScheduleHoverCard(bar.occurrence.sourceScheduleId)}
                            onClick={(event) => showScheduleHoverCard(bar.occurrence, event)}
                          >
                            <span className="loom-schedules-month-bar-title">{getInitials(bar.occurrence.familyMemberName)} - {bar.occurrence.title}</span>
                            <span className="loom-schedules-month-bar-meta">{bar.occurrence.startsAtLocal.slice(0, 5)}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <aside className="loom-calendar-side">
              <section className="loom-card p-4">
                <h4 className="loom-section-title">
                  {selectedMonthDay ? format(selectedMonthDay, "EEEE, MMM d", { locale: dateFnsLocale }) : t("schedules.dayDetails", "Day details")}
                </h4>
                <div className="loom-stack-sm mt-3">
                  {!selectedMonthDay ? <p className="loom-muted">{t("schedules.selectDayHint", "Select a day on the calendar to see the schedules planned for it.")}</p> : null}
                  {selectedMonthDay && selectedMonthOccurrences.length === 0 ? <p className="loom-muted">{t("schedules.noneOnDay", "No schedule")}</p> : null}
                  {selectedMonthOccurrences.map((occurrence) => (
                    <button
                      key={occurrence.id}
                      type="button"
                      className="loom-calendar-upcoming-row loom-schedules-day-row"
                      onClick={() => setEditingScheduleId(occurrence.sourceScheduleId)}
                    >
                      <span className="loom-calendar-stripe is-schedule" style={{ backgroundColor: occurrence.color }} />
                      <div className="loom-row-between">
                        <div>
                          <p className="m-0 font-semibold">{occurrence.familyMemberName} · {occurrence.title}</p>
                          <p className="loom-muted small m-0">
                            {occurrence.startsAtLocal.slice(0, 5)} - {occurrence.spansNextDay
                              ? `${format(occurrence.endAt, "EEE, MMM d", { locale: dateFnsLocale })} ${occurrence.endsAtLocal.slice(0, 5)}`
                              : occurrence.endsAtLocal.slice(0, 5)}
                          </p>
                          <p className="loom-muted small m-0">
                            {occurrence.scheduleTitle}
                            {occurrence.location ? ` · ${occurrence.location}` : ""}
                          </p>
                        </div>
                        <span className="loom-home-pill is-muted m-0">{t(`schedules.categoryLabel.${occurrence.category}`, occurrence.category)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      ) : null}

      {viewMode === "week" ? (
        <section className="loom-schedules-week">
          <div className="loom-schedules-calendar-toolbar">
            <div className="loom-inline-actions">
              <button type="button" className="loom-button-ghost" onClick={() => setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                {t("calendar.today", "Today")}
              </button>
              <button className="loom-calendar-nav" type="button" onClick={() => setWeekAnchor((current) => addDays(current, -7))} aria-label={t("calendar.previousWeek", "Previous week")}>
                ‹
              </button>
              <button className="loom-calendar-nav" type="button" onClick={() => setWeekAnchor((current) => addDays(current, 7))} aria-label={t("calendar.nextWeek", "Next week")}>
                ›
              </button>
            </div>
            <h3 className="loom-calendar-month">{format(weekDays[0] ?? new Date(), "MMM d", { locale: dateFnsLocale })} - {format(weekDays[6] ?? new Date(), "MMM d", { locale: dateFnsLocale })}</h3>
          </div>

          <div className="loom-schedules-week-shell">
            <div className="loom-schedules-week-header">
              <div className="loom-schedules-week-gutter" />
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="loom-schedules-week-header-day">
                  <span className="loom-schedules-week-header-label">{format(day, "EEE", { locale: dateFnsLocale }).toUpperCase()}</span>
                  <span className="loom-schedules-week-header-date">{format(day, "d", { locale: dateFnsLocale })}</span>
                </div>
              ))}
            </div>

            <div className="loom-schedules-week-body" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              <div className="loom-schedules-week-time-rail">
                {HOURS.map((hour) => (
                  <div key={hour} className="loom-schedules-week-time-label" style={{ top: `${hour * HOUR_HEIGHT}px` }}>
                    {`${String(hour).padStart(2, "0")}:00`}
                  </div>
                ))}
              </div>

              <div className="loom-schedules-week-grid">
                {weekDays.map((day, dayIndex) => (
                  <div key={day.toISOString()} className="loom-schedules-week-column">
                    {HOURS.map((hour) => (
                      <div key={`${day.toISOString()}-${hour}`} className="loom-schedules-week-hour" style={{ top: `${hour * HOUR_HEIGHT}px` }} />
                    ))}
                    {(weekSegments[dayIndex] ?? []).map((segment) => {
                      const width = `calc(${100 / segment.laneCount}% - 6px)`;
                      const left = `calc(${(100 / segment.laneCount) * segment.lane}% + 3px)`;
                      const top = (segment.startMinutes / 60) * HOUR_HEIGHT;
                      const height = Math.max(24, ((segment.endMinutes - segment.startMinutes) / 60) * HOUR_HEIGHT);
                      return (
                        <button
                          key={`${segment.occurrence.id}-${segment.dayIndex}`}
                          type="button"
                          className={`loom-schedules-week-event ${categoryClass(segment.occurrence.category)}`.trim()}
                          style={{ left, top: `${top}px`, width, height: `${height}px`, ...scheduleSurfaceStyle(segment.occurrence.color) }}
                          onMouseEnter={(event) => showScheduleHoverCard(segment.occurrence, event)}
                          onMouseLeave={() => hideScheduleHoverCard(segment.occurrence.sourceScheduleId)}
                          onClick={(event) => showScheduleHoverCard(segment.occurrence, event)}
                        >
                          <span className="loom-schedules-week-event-title">{getInitials(segment.occurrence.familyMemberName)} - {segment.occurrence.title}</span>
                          <span className="loom-schedules-week-event-meta">{segment.occurrence.location ?? segment.occurrence.scheduleTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <ResponsivePanel isOpen={isCreateOpen} title={t("schedules.createTitle", "Create schedule")} onClose={closePanels} variant="modal" size="wide">
        <ScheduleForm familyId={familyId} familyMembers={familyMembers} templates={templates} endpoint="/api/schedules" method="POST" submitLabel={t("schedules.createTitle", "Create schedule")} redirectTo="/schedules" onSaved={() => closePanels()} />
      </ResponsivePanel>

      <ResponsivePanel
        isOpen={Boolean(selectedSchedule)}
        title={selectedSchedule?.title ?? t("schedules.editTitle", "Edit schedule")}
        onClose={closePanels}
        size="wide"
        headerActions={
          <div className="loom-inline-actions">
            <span className="loom-task-drawer-save-indicator" aria-live="polite">
              {drawerSaveError
                ? t("common.error", "Error")
                : drawerSaveState === "saving"
                  ? t("common.saving", "Saving...")
                  : drawerSaveState === "saved"
                    ? t("tasks.allChangesSaved", "Saved")
                    : ""}
            </span>
            {deleteError ? <span className="loom-feedback-error">{deleteError}</span> : null}
            <button type="button" className="loom-button-ghost" onClick={() => void archiveSchedule()} disabled={isDeleting}>
              {isDeleting ? t("common.deleting", "Deleting...") : t("common.archive", "Archive")}
            </button>
            <button type="button" className="loom-task-icon-button" aria-label={t("common.close", "Close")} onClick={closePanels}>
              ×
            </button>
          </div>
        }
      >
        {selectedSchedule ? (
          <div className="loom-form-stack">
            <ScheduleForm
              familyId={familyId}
              familyMembers={familyMembers}
              templates={templates}
              endpoint={`/api/schedules/${selectedSchedule.id}`}
              method="PATCH"
              submitLabel={t("common.save", "Save")}
              redirectTo={`/schedules/${selectedSchedule.id}`}
              autoSave
              refreshOnSave={false}
              onAutoSaveStateChange={(state, error) => {
                setDrawerSaveState(state);
                setDrawerSaveError(error ?? null);
              }}
              onSaved={(_scheduleId, savedSchedule) => {
                setDeleteError(null);
                if (!savedSchedule) {
                  return;
                }

                setSchedules((current) => current.map((schedule) => (schedule.id === savedSchedule.id ? savedSchedule : schedule)));
              }}
              initialValues={{
                familyMemberId: selectedSchedule.familyMemberId,
                title: selectedSchedule.title,
                category: selectedSchedule.category,
                color: selectedSchedule.color,
                location: selectedSchedule.location ?? "",
                notes: selectedSchedule.notes ?? "",
                startsOn: selectedSchedule.startsOn,
                endsOn: selectedSchedule.endsOn ?? "",
                cycleLengthWeeks: selectedSchedule.cycleLengthWeeks,
                isEnabled: selectedSchedule.isEnabled,
                blocks: selectedSchedule.blocks.map((block) => ({
                  templateId: block.templateId,
                  weekIndex: block.weekIndex,
                  weekday: block.weekday,
                  title: block.title,
                  location: block.location ?? "",
                  startsAtLocal: block.startsAtLocal.slice(0, 5),
                  endsAtLocal: block.endsAtLocal.slice(0, 5),
                  spansNextDay: block.spansNextDay,
                  sortOrder: block.sortOrder
                })),
                pauses: selectedSchedule.pauses.map((pause) => ({
                  startOn: pause.startOn,
                  endOn: pause.endOn,
                  reason: pause.reason ?? ""
                })),
                overrideDays: selectedSchedule.overrideDays.map((overrideDay) => ({
                  overrideDate: overrideDay.overrideDate,
                  notes: overrideDay.notes ?? "",
                  blocks: overrideDay.blocks.map((block) => ({
                    templateId: block.templateId,
                    title: block.title,
                    location: block.location ?? "",
                    startsAtLocal: block.startsAtLocal.slice(0, 5),
                    endsAtLocal: block.endsAtLocal.slice(0, 5),
                    spansNextDay: block.spansNextDay,
                    sortOrder: block.sortOrder
                  }))
                }))
              }}
            />
            <ScheduleExceptionsManager schedule={selectedSchedule} templates={templates} />
          </div>
        ) : null}
      </ResponsivePanel>

      {scheduleHoverCard ? (
        <div
          className="loom-calendar-task-hover-card"
          style={{ left: scheduleHoverCard.left, top: scheduleHoverCard.top }}
          onMouseEnter={() => {
            if (scheduleHoverHideTimeoutRef.current) {
              window.clearTimeout(scheduleHoverHideTimeoutRef.current);
              scheduleHoverHideTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => hideScheduleHoverCard()}
        >
          <div className="loom-row-between">
            <strong>{scheduleHoverCard.occurrence.title}</strong>
            <button
              type="button"
              className="loom-calendar-task-hover-edit"
              aria-label={t("common.edit", "Edit")}
              onClick={() => {
                setEditingScheduleId(scheduleHoverCard.occurrence.sourceScheduleId);
                setScheduleHoverCard(null);
              }}
            >
              ↗
            </button>
          </div>
          <div className="loom-calendar-task-hover-grid">
            <span>{scheduleHoverCard.occurrence.familyMemberName}</span>
            <span>{t(`schedules.categoryLabel.${scheduleHoverCard.occurrence.category}`, scheduleHoverCard.occurrence.category)}</span>
            <span>{format(scheduleHoverCard.occurrence.startAt, "EEE, MMM d", { locale: dateFnsLocale })}</span>
            <span>
              {scheduleHoverCard.occurrence.startsAtLocal.slice(0, 5)} - {scheduleHoverCard.occurrence.spansNextDay
                ? `${format(scheduleHoverCard.occurrence.endAt, "EEE, MMM d", { locale: dateFnsLocale })} ${scheduleHoverCard.occurrence.endsAtLocal.slice(0, 5)}`
                : scheduleHoverCard.occurrence.endsAtLocal.slice(0, 5)}
            </span>
            <span>{scheduleHoverCard.occurrence.scheduleTitle}</span>
            <span>{scheduleHoverCard.occurrence.location ?? t("common.none", "None")}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
