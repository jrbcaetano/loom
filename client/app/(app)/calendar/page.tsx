import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getEventsForFamily } from "@/features/events/server";
import { getTasksForFamily } from "@/features/tasks/server";
import { CalendarView } from "@/features/events/calendar-view";
import { getServerI18n } from "@/lib/i18n/server";

export default async function CalendarPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("calendar.createFamilyFirst", "Create a family to use calendar.")}</p>;
  }

  let events: Awaited<ReturnType<typeof getEventsForFamily>> = [];
  let tasks: Awaited<ReturnType<typeof getTasksForFamily>> = [];
  let loadError = false;

  const [eventsResult, tasksResult] = await Promise.allSettled([
    getEventsForFamily(context.activeFamilyId),
    getTasksForFamily(context.activeFamilyId, { status: "all" })
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
        currentUserId={user.id}
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          location: event.location,
          visibility: event.visibility
        }))}
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
