import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { FamilyMembersClient } from "@/features/families/family-members-client";
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
        <Link href="/family/members?create=family-member" className="loom-module-header-plus" aria-label={t("family.inviteTitle", "Invite member")}>
          +
        </Link>
      </section>

      <FamilyMembersClient familyId={context.activeFamilyId} members={members} />
    </div>
  );
}
