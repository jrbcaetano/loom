import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getHomeSnapshot } from "@/features/home/server";
import { VisibilityBadge } from "@/components/common/visibility-badge";

export default async function HomePage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family to continue.</p>;
  }

  const snapshot = await getHomeSnapshot(context.activeFamilyId, user.id);

  return (
    <div className="loom-dashboard-grid">
      <section className="loom-card p-4">
        <div className="loom-row-between">
          <h2 className="loom-section-title">My tasks today</h2>
          <Link href="/tasks/new" className="loom-subtle-link">
            New task
          </Link>
        </div>
        <div className="loom-stack-sm mt-3">
          {snapshot.myTasks.length === 0 ? <p className="loom-muted">No tasks due right now.</p> : null}
          {snapshot.myTasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`} className="loom-card soft p-3 block">
              <p className="m-0 font-semibold">{task.title}</p>
              <p className="loom-muted small mt-1">{task.due_at ? new Date(task.due_at).toLocaleString() : "No due date"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="loom-card p-4">
        <h2 className="loom-section-title">Family tasks summary</h2>
        <p className="loom-muted mt-2">Open: {snapshot.familySummary.openCount}</p>
        <p className="loom-muted">Done: {snapshot.familySummary.doneCount}</p>
        <p className="loom-muted">Total: {snapshot.familySummary.totalCount}</p>
      </section>

      <section className="loom-card p-4">
        <div className="loom-row-between">
          <h2 className="loom-section-title">Upcoming events</h2>
          <Link href="/calendar/new" className="loom-subtle-link">
            New event
          </Link>
        </div>
        <div className="loom-stack-sm mt-3">
          {snapshot.upcomingEvents.length === 0 ? <p className="loom-muted">No events planned.</p> : null}
          {snapshot.upcomingEvents.map((event) => (
            <Link key={event.id} href={`/calendar/${event.id}`} className="loom-card soft p-3 block">
              <p className="m-0 font-semibold">{event.title}</p>
              <p className="loom-muted small mt-1">{new Date(event.start_at).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="loom-card p-4">
        <div className="loom-row-between">
          <h2 className="loom-section-title">Recent lists</h2>
          <Link href="/lists/new" className="loom-subtle-link">
            New list
          </Link>
        </div>
        <div className="loom-stack-sm mt-3">
          {snapshot.recentLists.length === 0 ? <p className="loom-muted">No lists yet.</p> : null}
          {snapshot.recentLists.map((list) => (
            <Link key={list.id} href={`/lists/${list.id}`} className="loom-card soft p-3 block">
              <div className="loom-row-between">
                <p className="m-0 font-semibold">{list.title}</p>
                <VisibilityBadge visibility={list.visibility} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
