import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { InviteMemberForm } from "@/features/families/invite-member-form";
import { FamilyMembersList } from "@/features/families/family-members-list";
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
        <p className="loom-muted mt-1">
          {t("family.inviteSubtitle", "Invite by email. A Product Admin must activate app access before they can use Loom.")}
        </p>
        <div className="mt-4">
          <InviteMemberForm familyId={context.activeFamilyId} />
        </div>
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">{t("family.membersSectionTitle", "Members")}</h2>
        <FamilyMembersList familyId={context.activeFamilyId} members={members} />
      </section>
    </div>
  );
}
