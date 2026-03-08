import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveFamilyContext } from "@/features/families/context";
import { ensureFamilyConversation } from "@/features/messages/server";

export default async function FamilyMessagesPage() {
  const user = await requireUser();
  const context = await getActiveFamilyContext(user.id);

  if (!context.activeFamilyId) {
    redirect("/home");
  }

  const conversationId = await ensureFamilyConversation(context.activeFamilyId);
  redirect(`/messages/${conversationId}`);
}
