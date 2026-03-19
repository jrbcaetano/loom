"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/context";

type ConversationSummary = {
  id: string;
  familyId: string;
  type: "family" | "direct";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  memberNames: string[];
};

type MemberOption = {
  userId: string;
  displayName: string;
};

async function fetchConversations(familyId: string) {
  const response = await fetch(`/api/messages/conversations?familyId=${familyId}`, { cache: "no-store" });
  const payload = (await response.json()) as { conversations?: ConversationSummary[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load conversations");
  return payload.conversations ?? [];
}

export function MessagesClient({
  familyId,
  members,
  initialConversations
}: {
  familyId: string;
  members: MemberOption[];
  initialConversations?: ConversationSummary[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["conversations", familyId],
    queryFn: () => fetchConversations(familyId),
    initialData: initialConversations
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ familyId, otherUserId: selectedUserId })
      });
      const payload = (await response.json()) as { conversationId?: string; error?: string };
      if (!response.ok || !payload.conversationId) {
        throw new Error(payload.error ?? t("messages.createDirectError", "Failed to create direct conversation"));
      }
      return payload.conversationId;
    },
    onSuccess: (conversationId) => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["conversations", familyId] });
      startTransition(() => {
        router.push(`/messages/${conversationId}`);
      });
    },
    onError: (mutationError) => {
      setServerError(mutationError instanceof Error ? mutationError.message : t("messages.createDirectError", "Failed to create direct conversation"));
    }
  });

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h2 className="loom-section-title">{t("messages.startPrivate", "Start private conversation")}</h2>
          <Link href="/messages/family" className="loom-button-ghost">
            {t("messages.familyChat", "Family chat")}
          </Link>
        </div>
        <div className="loom-form-inline mt-3">
          <label className="loom-field">
            <span>{t("messages.familyMember", "Family member")}</span>
            <select className="loom-input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">{t("messages.selectMember", "Select member")}</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <button className="loom-button-primary" type="button" disabled={!selectedUserId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? t("messages.opening", "Opening...") : t("messages.message", "Message")}
          </button>
        </div>
        {serverError ? <p className="loom-feedback-error mt-2">{serverError}</p> : null}
      </section>

      <section className="loom-card">
        {isPending ? <p className="loom-muted mt-3">{t("messages.loadingConversations", "Loading conversations...")}</p> : null}
        {error ? <p className="loom-feedback-error mt-3">{error.message}</p> : null}

        <div className="loom-entity-list p-3">
          {(data ?? []).map((conversation) => (
            <article key={conversation.id} className="loom-conversation-row">
              <div>
                <Link className="loom-link-strong" href={`/messages/${conversation.id}`}>
                  {conversation.type === "family" ? t("messages.familyChat", "Family chat") : conversation.memberNames.join(", ")}
                </Link>
                <p className="loom-entity-meta">{conversation.lastMessage ?? t("messages.noMessagesYet", "No messages yet")}</p>
              </div>
              <div className="loom-inline-actions">
                {conversation.unreadCount > 0 ? <span className="loom-unread-dot" /> : null}
                <span className="loom-badge">{conversation.unreadCount > 0 ? `${conversation.unreadCount} ${t("messages.unread", "unread")}` : t("messages.read", "Read")}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
