import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { MessageThreadClient } from "@/features/messages/thread-client";
import { getMessages } from "@/features/messages/server";
import { getServerI18n } from "@/lib/i18n/server";

type MessageThreadPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function MessageThreadPage({ params }: MessageThreadPageProps) {
  const user = await requireUser();
  const { t } = await getServerI18n();
  const { conversationId } = await params;
  const initialMessages = await getMessages(conversationId);

  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <h2 className="loom-module-title">{t("messages.conversation", "Conversation")}</h2>
          <p className="loom-module-subtitle">{t("messages.conversationSubtitle", "Realtime chat for your family and direct messages.")}</p>
        </div>
        <Link href="/messages" className="loom-button-ghost">
          {t("messages.backToInbox", "Back to inbox")}
        </Link>
      </section>
      <MessageThreadClient conversationId={conversationId} currentUserId={user.id} initialMessages={initialMessages} />
    </div>
  );
}
