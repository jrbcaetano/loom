import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { MessagesClient } from "@/features/messages/messages-client";
import { getConversations } from "@/features/messages/server";
import { getServerI18n } from "@/lib/i18n/server";

export default async function MessagesPage() {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">{t("onboarding.createFamilyFirst", "Create a family first.")}</p>;
  }

  const members = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId && member.userId !== user.id)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? t("common.member", "Member") }));
  const initialConversations = await getConversations(context.activeFamilyId);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("nav.messages", "Messages")}</h2>
          <p className="loom-module-subtitle">{t("messages.subtitle", "Family and direct conversations in one inbox.")}</p>
        </div>
      </section>
      <MessagesClient familyId={context.activeFamilyId} members={members} initialConversations={initialConversations} />
    </div>
  );
}
