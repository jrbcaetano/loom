import { redirect } from "next/navigation";

type MessageThreadPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function MessageThreadPage({ params }: MessageThreadPageProps) {
  const { conversationId } = await params;
  redirect(`/messages?item=${encodeURIComponent(conversationId)}`);
}

