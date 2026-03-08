import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { getFamilyMembers } from "@/features/families/server";
import { MessagesClient } from "@/features/messages/messages-client";

export default async function MessagesPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    return <p className="loom-muted">Create a family first.</p>;
  }

  const members = (await getFamilyMembers(context.activeFamilyId))
    .filter((member) => member.userId && member.userId !== user.id)
    .map((member) => ({ userId: member.userId!, displayName: member.fullName ?? member.email ?? "Member" }));

  return <MessagesClient familyId={context.activeFamilyId} members={members} />;
}
