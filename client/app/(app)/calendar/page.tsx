import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getEventsForFamily } from "@/features/events/server";
import { getTasksForFamily } from "@/features/tasks/server";
import { CalendarView } from "@/features/events/calendar-view";

export default async function CalendarPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family to use calendar.</p>;
  }

  const events = await getEventsForFamily(context.activeFamilyId);
  const tasks = await getTasksForFamily(context.activeFamilyId, { status: "all" });

  return (
    <div className="loom-stack">
      <div className="loom-row-between">
        <p className="loom-muted">Keep everyone aligned with a shared family schedule.</p>
        <Link href="/calendar/new" className="loom-button-primary">
          New event
        </Link>
      </div>
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
