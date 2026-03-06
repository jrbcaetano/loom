import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { inviteMember } from "./actions";
import { AppShell } from "@/components/app-shell";
import { InviteMemberForm } from "@/components/invite-member-form";
import { getUserSpaces } from "@/lib/data/spaces";
import { createClient } from "@/lib/supabase/server";

type SpaceRow = {
  id: string;
  name: string;
  space_memberships: { role: "admin" | "member" }[];
};

type MemberRow = {
  id: string;
  role: "admin" | "member";
  user_id: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
  accepted_at: string | null;
};

export default async function SpaceAdminPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await supabase.rpc("claim_space_invites_for_current_user");
  const spaces = await getUserSpaces(user.id);

  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, name, space_memberships!inner(role)")
    .eq("id", spaceId)
    .eq("space_memberships.user_id", user.id)
    .single();

  if (spaceError || !space) {
    notFound();
  }

  const spaceRow = space as unknown as SpaceRow;
  const currentRole = spaceRow.space_memberships[0]?.role;
  if (currentRole !== "admin") {
    redirect("/dashboard");
  }

  const { data: members } = await supabase
    .from("space_memberships")
    .select("id, user_id, role")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });

  const { data: invites } = await supabase
    .from("space_invites")
    .select("id, email, role, created_at, accepted_at")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });

  const memberRows = (members ?? []) as MemberRow[];
  const inviteRows = (invites ?? []) as InviteRow[];
  const pendingInvites = inviteRows.filter((invite) => !invite.accepted_at);

  const inviteAction = inviteMember.bind(null, spaceId);
  const rightPanel = (
    <div className="loom-stack">
      <section className="loom-rail-card">
        <p className="loom-rail-label">Pending Invites</p>
        <ul className="loom-list">
          {pendingInvites.map((invite) => (
            <li key={invite.id} className="loom-rail-item">
              {invite.email}
            </li>
          ))}
          {pendingInvites.length === 0 ? <li className="loom-rail-item">No pending invites</li> : null}
        </ul>
      </section>
      <section className="loom-rail-card">
        <p className="loom-rail-label">Admin Tips</p>
        <ul className="loom-list">
          <li className="loom-rail-item">Invite using the same email used for Google sign-in</li>
          <li className="loom-rail-item">Promote only trusted members to admin</li>
        </ul>
      </section>
    </div>
  );

  return (
    <AppShell
      title={`Admin: ${spaceRow.name}`}
      subtitle="Control who can access this space."
      userEmail={user.email}
      spaces={spaces}
      activeSpaceId={spaceId}
      rightPanel={rightPanel}
    >
      <section className="loom-card soft p-6">
        <Link href="/dashboard" className="loom-subtle-link">
          Back to inbox
        </Link>
        <h3 className="loom-section-title mt-2">Invite by email</h3>
        <p className="mt-1 text-sm loom-muted">Invited users join this space automatically at their next login.</p>

        <div className="mt-4">
          <InviteMemberForm action={inviteAction} />
        </div>
      </section>

      <section className="loom-task-group">
        <h3 className="loom-section-title">Current Members</h3>
        <ul className="loom-task-list">
          {memberRows.map((member) => (
            <li key={member.id} className="loom-task-item">
              <span className="loom-task-check" aria-hidden="true" />
              <div className="loom-task-body">
                <p className="loom-task-title">{member.user_id}</p>
                <p className="loom-task-meta">Role: {member.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
