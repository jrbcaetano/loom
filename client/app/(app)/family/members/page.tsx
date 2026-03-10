import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { InviteMemberForm } from "@/features/families/invite-member-form";
import { getServerI18n } from "@/lib/i18n/server";

export default async function FamilyMembersPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const members = await getFamilyMembers(context.activeFamilyId);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("family.membersTitle", "Family Members")}</h2>
          <p className="loom-module-subtitle">{t("family.membersSubtitle", "Invite and manage roles for everyone in the family.")}</p>
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("family.inviteTitle", "Invite member")}</h2>
        <p className="loom-muted mt-1">{t("family.inviteSubtitle", "Invite by email. Access is granted when they log in with that email.")}</p>
        <div className="mt-4">
          <InviteMemberForm familyId={context.activeFamilyId} />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("family.membersSectionTitle", "Members")}</h2>
        <div className="loom-stack-sm mt-3">
          {members.map((member) => (
            <article key={member.id} className="loom-row-between border-b border-slate-100 pb-3">
              <div>
                <p className="m-0 font-semibold">{member.fullName ?? member.email ?? t("family.pendingInvite", "Pending invite")}</p>
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
