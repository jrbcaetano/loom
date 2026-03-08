import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { InviteMemberForm } from "@/features/families/invite-member-form";

export default async function FamilyMembersPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const members = await getFamilyMembers(context.activeFamilyId);

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <h2 className="loom-section-title">Invite member</h2>
        <p className="loom-muted mt-1">Invite by email. Access is granted when they log in with that email.</p>
        <div className="mt-4">
          <InviteMemberForm familyId={context.activeFamilyId} />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Members</h2>
        <div className="loom-stack-sm mt-3">
          {members.map((member) => (
            <article key={member.id} className="loom-row-between border-b border-slate-100 pb-3">
              <div>
                <p className="m-0 font-semibold">{member.fullName ?? member.email ?? "Pending invite"}</p>
                <p className="loom-muted small mt-1">{member.status}</p>
              </div>
              <p className="loom-muted small">{member.role}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
