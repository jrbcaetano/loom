import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateSpaceForm } from "@/components/create-space-form";
import { AppShell } from "@/components/app-shell";
import { getUserSpaces } from "@/lib/data/spaces";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await supabase.rpc("claim_space_invites_for_current_user");
  const spaces = await getUserSpaces(user.id);
  const adminSpaces = spaces.filter((space) => space.role === "admin");

  const rightPanel = (
    <div className="loom-stack">
      <section className="loom-rail-card">
        <p className="loom-rail-label">Space Suggestions</p>
        <ul className="loom-list">
          <li className="loom-rail-item">+ Grocery planning board</li>
          <li className="loom-rail-item">+ Weekly chores template</li>
          <li className="loom-rail-item">+ School and activities</li>
        </ul>
      </section>
      <section className="loom-rail-card">
        <p className="loom-rail-label">Next Feature Drops</p>
        <ul className="loom-list">
          <li className="loom-rail-item">Shopping lists (shared)</li>
          <li className="loom-rail-item">Tasks: Today and Upcoming</li>
          <li className="loom-rail-item">Reminders and alerts</li>
        </ul>
      </section>
    </div>
  );

  return (
    <AppShell
      title="Inbox"
      subtitle="Plan family life in one place, with space-based sharing controls."
      userEmail={user.email}
      spaces={spaces}
      rightPanel={rightPanel}
    >
      <section className="loom-card soft p-6" id="create-space-section">
        <h3 className="loom-section-title">Create a new Space</h3>
        <p className="mt-1 text-sm loom-muted">Start a workspace for one family unit, then invite members by email.</p>
        <div className="mt-4">
          <CreateSpaceForm />
        </div>
      </section>

      <section className="loom-task-group">
        <h3 className="loom-section-title">Your Spaces</h3>
        <ul className="loom-task-list">
          {spaces.map((space) => (
            <li key={space.id} className="loom-task-item">
              <span className="loom-task-check" aria-hidden="true" />
              <div className="loom-task-body">
                <p className="loom-task-title">{space.name}</p>
                <p className="loom-task-meta">
                  Role: {space.role}
                  {space.role === "admin" ? (
                    <Link href={`/dashboard/spaces/${space.id}/admin`} className="loom-subtle-link">
                      Open admin
                    </Link>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {spaces.length === 0 ? <p className="mt-3 text-sm loom-muted">No spaces yet. Create one above.</p> : null}
      </section>

      {adminSpaces.length > 0 ? (
        <section className="loom-input-row">
          <span className="loom-input-row-prefix">+</span>
          <p className="loom-input-row-text">Add task (coming in the next MVP step)</p>
        </section>
      ) : null}
    </AppShell>
  );
}
