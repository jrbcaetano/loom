import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getEventsForFamily } from "@/features/events/server";
import { getTasksForFamily } from "@/features/tasks/server";
import { CalendarView } from "@/features/events/calendar-view";
import { getFamilyExternalCalendars } from "@/features/families/server";
import { fetchExternalCalendarEvents } from "@/features/events/external-calendars";
import { getServerI18n } from "@/lib/i18n/server";

type CalendarPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);
  const query = await searchParams;
  const selectedDate = typeof query.date === "string" ? query.date : undefined;

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("calendar.createFamilyFirst", "Create a family to use calendar.")}</p>;
  }

  let events: Awaited<ReturnType<typeof getEventsForFamily>> = [];
  let tasks: Awaited<ReturnType<typeof getTasksForFamily>> = [];
  let externalEvents: Awaited<ReturnType<typeof fetchExternalCalendarEvents>> = [];
  let loadError = false;

  const [eventsResult, tasksResult, externalCalendarsResult] = await Promise.allSettled([
    getEventsForFamily(context.activeFamilyId),
    getTasksForFamily(context.activeFamilyId, { status: "all" }),
    getFamilyExternalCalendars(context.activeFamilyId)
  ]);

  if (eventsResult.status === "fulfilled") {
    events = eventsResult.value;
  } else {
    loadError = true;
    console.error("Failed to load calendar events", eventsResult.reason);
  }

  if (tasksResult.status === "fulfilled") {
    tasks = tasksResult.value;
  } else {
    loadError = true;
    console.error("Failed to load calendar tasks", tasksResult.reason);
  }

  if (externalCalendarsResult.status === "fulfilled") {
    const enabledCalendars = externalCalendarsResult.value.filter((calendar) => calendar.isEnabled);
    if (enabledCalendars.length > 0) {
      const externalResults = await Promise.allSettled(
        enabledCalendars.map((calendar) =>
          fetchExternalCalendarEvents({
            id: calendar.id,
            displayName: calendar.displayName,
            sourceUrl: calendar.sourceUrl,
            isEnabled: calendar.isEnabled
          })
        )
      );

      for (const result of externalResults) {
        if (result.status === "fulfilled") {
          externalEvents = externalEvents.concat(result.value);
        } else {
          loadError = true;
          console.error("Failed to load external calendar", result.reason);
        }
      }
    }
  } else {
    loadError = true;
    console.error("Failed to load external calendar settings", externalCalendarsResult.reason);
  }

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.calendar", "Calendar")}</h2>
          {loadError ? (
            <p className="loom-feedback-error">
              {t("calendar.loadError", "Some calendar data could not be loaded. Please try again in a moment.")}
            </p>
          ) : null}
        </div>
      </section>
      <CalendarView
        selectedDate={selectedDate}
        events={[
          ...events.map((event) => ({
            id: event.id,
            sourceEventId: event.id,
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            allDay: event.allDay,
            location: event.location,
            visibility: event.visibility,
            createdByName: event.createdByName,
            createdByAvatarUrl: event.createdByAvatarUrl,
            recurrenceRule: event.recurrenceRule,
            isExternal: false as const,
            externalCalendarName: null
          })),
          ...externalEvents.map((event) => ({
            id: event.id,
            sourceEventId: event.sourceEventId,
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            allDay: event.allDay,
            location: event.location,
            visibility: "family" as const,
            createdByName: null,
            createdByAvatarUrl: null,
            recurrenceRule: event.recurrenceRule,
            isExternal: true as const,
            externalCalendarName: event.externalCalendarName
          }))
        ]}
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          startAt: task.startAt,
          dueAt: task.dueAt,
          visibility: task.visibility,
          assignedToUserId: task.assignedToUserId,
          status: task.status
        }))}
      />
    </div>
  );
}
