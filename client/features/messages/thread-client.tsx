"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  conversationId: string;
  senderUserId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};

async function fetchMessages(conversationId: string) {
  const response = await fetch(`/api/messages/${conversationId}/messages`, { cache: "no-store" });
  const payload = (await response.json()) as { messages?: MessageRow[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Failed to load messages");
  return payload.messages ?? [];
}

export function MessageThreadClient({ conversationId, currentUserId }: { conversationId: string; currentUserId: string }) {
  const [content, setContent] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId)
  });

  useEffect(() => {
    fetch(`/api/messages/${conversationId}/read`, { method: "POST" }).catch(() => null);
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          void fetch(`/api/messages/${conversationId}/read`, { method: "POST" });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch(`/api/messages/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to send message");
    },
    onSuccess: () => {
      setContent("");
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: (mutationError) => {
      setServerError(mutationError instanceof Error ? mutationError.message : "Failed to send message");
    }
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    mutation.mutate(text);
  }

  return (
    <div className="loom-stack">
      <section className="loom-card p-5">
        <h2 className="loom-section-title">Thread</h2>
        {isPending ? <p className="loom-muted mt-3">Loading messages...</p> : null}
        {error ? <p className="loom-feedback-error mt-3">{error.message}</p> : null}

        <div className="loom-stack-sm mt-3">
          {(data ?? []).map((message) => (
            <article key={message.id} className="loom-card soft p-3">
              <div className="loom-row-between">
                <p className="m-0 text-sm font-semibold">{message.senderUserId === currentUserId ? "You" : "Family member"}</p>
                <p className="m-0 loom-muted small">{new Date(message.createdAt).toLocaleString()}</p>
              </div>
              <p className="m-0 mt-2">{message.content}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="loom-card p-5">
        <form onSubmit={onSubmit} className="loom-form-stack">
          <label className="loom-field">
            <span>Message</span>
            <textarea className="loom-input loom-textarea" value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <button className="loom-button-primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending..." : "Send"}
          </button>
          {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
        </form>
      </section>
    </div>
  );
}
