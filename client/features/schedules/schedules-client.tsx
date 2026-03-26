"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { resolveDateFnsLocale } from "@/lib/date";
import { useI18n } from "@/lib/i18n/context";
import { ResponsivePanel } from "@/components/common/responsive-panel";
import { expandScheduleOccurrences, expandSchedulesForFamily } from "@/features/schedules/occurrences";
import { ScheduleExceptionsManager } from "@/features/schedules/schedule-exceptions-manager";
import { ScheduleForm } from "@/features/schedules/schedule-form";
import type { ScheduleSeriesRow, ScheduleTemplateRow } from "@/features/schedules/model";

type ViewMode = "list" | "month" | "week";

type FamilyMemberOption = {
  id: string;
  displayName: string;
  role: "admin" | "adult" | "child";
};

function byDate<T extends { occurrenceDate: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const current = map.get(item.occurrenceDate) ?? [];
    current.push(item);
    map.set(item.occurrenceDate, current);
  }
  return map;
}

export function SchedulesClient({
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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [monthAnchor, setMonthAnchor] = useState(startOfMonth(new Date()));
  const [weekAnchor, setWeekAnchor] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === editingScheduleId) ?? null,
    [editingScheduleId, schedules]
  );

  const upcomingBySchedule = useMemo(() => {
    const now = new Date();
    const rangeEnd = addDays(now, 60);
    return new Map(
      schedules.map((schedule) => [
        schedule.id,
        expandScheduleOccurrences(schedule, now, rangeEnd)[0] ?? null
      ])
    );
  }, [schedules]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(monthAnchor);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 })
    });
  }, [monthAnchor]);

  const monthOccurrences = useMemo(
    () => expandSchedulesForFamily(schedules, monthDays[0] ?? new Date(), monthDays[monthDays.length - 1] ?? new Date()),
    [monthDays, schedules]
  );
  const monthOccurrencesByDate = useMemo(() => byDate(monthOccurrences), [monthOccurrences]);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekAnchor, end: addDays(weekAnchor, 6) }),
    [weekAnchor]
  );
  const weekOccurrences = useMemo(
    () => expandSchedulesForFamily(schedules, weekDays[0] ?? new Date(), weekDays[weekDays.length - 1] ?? new Date()),
    [schedules, weekDays]
  );
  const weekOccurrencesByDate = useMemo(() => byDate(weekOccurrences), [weekOccurrences]);

  async function archiveSchedule() {
    if (!selectedSchedule) {
      return;
    }
    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) {
      return;
    }

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
  }

  return (
    <div className="loom-stack-sm">
      <section className="loom-card p-4">
        <div className="loom-row-between">
          <div className="loom-inline-actions">
            {(["list", "month", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`loom-button-ghost ${viewMode === mode ? "is-active" : ""}`.trim()}
                onClick={() => setViewMode(mode)}
              >
                {mode === "list"
                  ? t("common.list", "List")
                  : mode === "month"
                    ? t("calendar.month", "Month")
                    : t("calendar.thisWeek", "Week")}
              </button>
            ))}
          </div>
          <button type="button" className="loom-button-primary" onClick={() => setIsCreateOpen(true)}>
            {t("schedules.new", "New schedule")}
          </button>
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
                    <p className="m-0 font-semibold">{schedule.title}</p>
                    <p className="loom-entity-meta">
                      {schedule.familyMemberName} · {t(`schedules.categoryLabel.${schedule.category}`, schedule.category)} · {schedule.blocks.length} {t("schedules.blocksLabel", "blocks")}
                    </p>
                  </div>
                  <div>
                    <p className="m-0 small">{schedule.startsOn}{schedule.endsOn ? ` - ${schedule.endsOn}` : ""}</p>
                    <p className="loom-muted small m-0">
                      {upcoming
                        ? `${format(new Date(`${upcoming.occurrenceDate}T12:00:00`), "EEE, MMM d", { locale: dateFnsLocale })} · ${upcoming.startsAtLocal.slice(0, 5)}`
                        : t("schedules.noUpcomingForSchedule", "No upcoming blocks")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {viewMode === "month" ? (
        <section className="loom-card p-4">
          <div className="loom-calendar-header">
            <button className="loom-calendar-nav" type="button" onClick={() => setMonthAnchor((current) => subMonths(current, 1))} aria-label={t("calendar.previousMonth", "Previous month")}>
              ‹
            </button>
            <h3 className="loom-calendar-month">{format(monthAnchor, "MMMM yyyy", { locale: dateFnsLocale })}</h3>
            <button className="loom-calendar-nav" type="button" onClick={() => setMonthAnchor((current) => addMonths(current, 1))} aria-label={t("calendar.nextMonth", "Next month")}>
              ›
            </button>
          </div>
          <div className="loom-calendar-weekdays">
            {[t("calendar.mon", "Mon"), t("calendar.tue", "Tue"), t("calendar.wed", "Wed"), t("calendar.thu", "Thu"), t("calendar.fri", "Fri"), t("calendar.sat", "Sat"), t("calendar.sun", "Sun")].map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="loom-calendar-grid">
            {monthDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const items = monthOccurrencesByDate.get(dateKey) ?? [];
              return (
                <div key={dateKey} className={`loom-calendar-day ${format(day, "MM") === format(monthAnchor, "MM") ? "" : "is-muted"} ${items.length > 0 ? "is-has-items" : ""}`}>
                  <span className="loom-calendar-day-number">{format(day, "d", { locale: dateFnsLocale })}</span>
                  <div className="loom-stack-xs mt-2">
                    {items.slice(0, 3).map((item) => (
                      <button key={item.id} type="button" className="loom-calendar-upcoming-row" onClick={() => setEditingScheduleId(item.sourceScheduleId)}>
                        <span className="loom-calendar-stripe is-schedule" />
                        <div>
                          <p className="m-0 small font-semibold">{item.familyMemberName}</p>
                          <p className="loom-muted small m-0">{item.startsAtLocal.slice(0, 5)} · {item.title}</p>
                        </div>
                      </button>
                    ))}
                    {items.length > 3 ? <p className="loom-muted small m-0">+{items.length - 3}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {viewMode === "week" ? (
        <section className="loom-card p-4">
          <div className="loom-calendar-header">
            <button className="loom-calendar-nav" type="button" onClick={() => setWeekAnchor((current) => addDays(current, -7))} aria-label={t("calendar.previousWeek", "Previous week")}>
              ‹
            </button>
            <h3 className="loom-calendar-month">
              {format(weekDays[0] ?? new Date(), "MMM d", { locale: dateFnsLocale })} - {format(weekDays[6] ?? new Date(), "MMM d", { locale: dateFnsLocale })}
            </h3>
            <button className="loom-calendar-nav" type="button" onClick={() => setWeekAnchor((current) => addDays(current, 7))} aria-label={t("calendar.nextWeek", "Next week")}>
              ›
            </button>
          </div>
          <div className="loom-info-grid">
            {weekDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const items = weekOccurrencesByDate.get(dateKey) ?? [];
              return (
                <article key={dateKey} className="loom-info-item">
                  <p className="loom-info-label">{format(day, "EEE, MMM d", { locale: dateFnsLocale })}</p>
                  <div className="loom-stack-xs mt-2">
                    {items.length === 0 ? <p className="loom-muted small m-0">{t("schedules.noneOnDay", "No schedule")}</p> : null}
                    {items.map((item) => (
                      <button key={item.id} type="button" className="loom-calendar-upcoming-row" onClick={() => setEditingScheduleId(item.sourceScheduleId)}>
                        <span className="loom-calendar-stripe is-schedule" />
                        <div>
                          <p className="m-0 small font-semibold">{item.familyMemberName}</p>
                          <p className="loom-muted small m-0">{item.startsAtLocal.slice(0, 5)} - {item.endsAtLocal.slice(0, 5)}</p>
                          <p className="loom-muted small m-0">{item.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <ResponsivePanel
        isOpen={isCreateOpen}
        title={t("schedules.createTitle", "Create schedule")}
        onClose={closePanels}
        variant="modal"
        size="wide"
      >
        <ScheduleForm
          familyId={familyId}
          familyMembers={familyMembers}
          templates={templates}
          endpoint="/api/schedules"
          method="POST"
          submitLabel={t("schedules.createTitle", "Create schedule")}
          redirectTo="/schedules"
          onSaved={() => closePanels()}
        />
      </ResponsivePanel>

      <ResponsivePanel
        isOpen={Boolean(selectedSchedule)}
        title={selectedSchedule?.title ?? t("schedules.editTitle", "Edit schedule")}
        onClose={closePanels}
        size="wide"
        headerActions={
          <div className="loom-inline-actions">
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
    </div>
  );
}
