import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { MessageThreadClient } from "@/features/messages/thread-client";

type MessageThreadPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function MessageThreadPage({ params }: MessageThreadPageProps) {
  const user = await requireUser();
  const { conversationId } = await params;

  return (
    <div className="loom-stack">
      <div>
        <Link href="/messages" className="loom-subtle-link">
          Back to conversations
        </Link>
      </div>
      <MessageThreadClient conversationId={conversationId} currentUserId={user.id} />
    </div>
  );
}
