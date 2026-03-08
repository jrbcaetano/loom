"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function MessagesClient({ familyId, members }: { familyId: string; members: MemberOption[] }) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["conversations", familyId],
    queryFn: () => fetchConversations(familyId)
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
        throw new Error(payload.error ?? "Failed to create direct conversation");
      }
      return payload.conversationId;
    },
    onSuccess: (conversationId) => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["conversations", familyId] });
      window.location.href = `/messages/${conversationId}`;
    },
    onError: (mutationError) => {
      setServerError(mutationError instanceof Error ? mutationError.message : "Failed to create direct conversation");
    }
  });

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <div className="loom-row-between">
          <h2 className="loom-section-title">Start private conversation</h2>
          <Link href="/messages/family" className="loom-subtle-link">
            Open family chat
          </Link>
        </div>
        <div className="loom-form-inline mt-3">
          <label className="loom-field">
            <span>Family member</span>
            <select className="loom-input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <button className="loom-button-primary" type="button" disabled={!selectedUserId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Opening..." : "Message"}
          </button>
        </div>
        {serverError ? <p className="loom-feedback-error mt-2">{serverError}</p> : null}
      </section>

      <section className="loom-card p-5">
        <h2 className="loom-section-title">Conversations</h2>
        {isPending ? <p className="loom-muted mt-3">Loading conversations...</p> : null}
        {error ? <p className="loom-feedback-error mt-3">{error.message}</p> : null}

        <div className="loom-stack-sm mt-3">
          {(data ?? []).map((conversation) => (
            <article key={conversation.id} className="loom-card soft p-4">
              <div className="loom-row-between">
                <div>
                  <Link className="loom-link-strong" href={`/messages/${conversation.id}`}>
                    {conversation.type === "family" ? "Family chat" : conversation.memberNames.join(", ")}
                  </Link>
                  <p className="loom-muted small mt-1">{conversation.lastMessage ?? "No messages yet"}</p>
                </div>
                {conversation.unreadCount > 0 ? <span className="loom-badge">{conversation.unreadCount} unread</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
