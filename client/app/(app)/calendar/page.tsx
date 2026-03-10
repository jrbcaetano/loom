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

  const events = await getEventsForFamily(context.activeFamilyId);
  const tasks = await getTasksForFamily(context.activeFamilyId, { status: "all" });

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.calendar", "Calendar")}</h2>
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
