"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { resolveDateLocale } from "@/lib/date";

type MessageRow = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
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
  const { t, locale } = useI18n();
  const dateLocale = resolveDateLocale(locale);
  const [content, setContent] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const firstUnreadMessageRef = useRef<HTMLElement | null>(null);
  const hasInitialScrollRef = useRef(false);
  const shouldScrollToBottomOnNextDataRef = useRef(false);

  const { data, isPending, error } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId)
  });

  const scrollToBottom = () => {
    const listEl = threadListRef.current;
    if (!listEl) return;
    listEl.scrollTop = listEl.scrollHeight;
  };

  useEffect(() => {
    fetch(`/api/messages/${conversationId}/read`, { method: "POST" }).catch(() => null);
  }, [conversationId]);

  useEffect(() => {
    hasInitialScrollRef.current = false;
    firstUnreadMessageRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!data || hasInitialScrollRef.current) {
      return;
    }

    const listEl = threadListRef.current;
    if (!listEl) {
      return;
    }

    const unreadIndex = data.findIndex(
      (message) => message.senderUserId !== currentUserId && message.readAt === null
    );

    const scroll = () => {
      if (unreadIndex >= 0 && firstUnreadMessageRef.current) {
        firstUnreadMessageRef.current.scrollIntoView({ block: "start", behavior: "auto" });
      } else {
        listEl.scrollTop = listEl.scrollHeight;
      }
      hasInitialScrollRef.current = true;
    };

    const raf = window.requestAnimationFrame(scroll);
    return () => window.cancelAnimationFrame(raf);
  }, [currentUserId, data]);

  useEffect(() => {
    if (!data || !shouldScrollToBottomOnNextDataRef.current) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      scrollToBottom();
      shouldScrollToBottomOnNextDataRef.current = false;
    });

    return () => window.cancelAnimationFrame(raf);
  }, [data]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          shouldScrollToBottomOnNextDataRef.current = true;
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
      if (!response.ok) throw new Error(payload.error ?? t("messages.sendError", "Failed to send message"));
    },
    onSuccess: () => {
      setContent("");
      setServerError(null);
      shouldScrollToBottomOnNextDataRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
    onError: (mutationError) => {
      setServerError(mutationError instanceof Error ? mutationError.message : t("messages.sendError", "Failed to send message"));
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
        <h2 className="loom-section-title">{t("messages.thread", "Thread")}</h2>
        {isPending ? <p className="loom-muted mt-3">{t("messages.loadingMessages", "Loading messages...")}</p> : null}
        {error ? <p className="loom-feedback-error mt-3">{error.message}</p> : null}

        <div ref={threadListRef} className="loom-thread-list mt-3">
          {(data ?? []).map((message) => {
            const isUnreadIncoming = message.senderUserId !== currentUserId && message.readAt === null;
            return (
            <article
              key={message.id}
              ref={isUnreadIncoming && !firstUnreadMessageRef.current ? firstUnreadMessageRef : undefined}
              className={`loom-thread-message ${message.senderUserId === currentUserId ? "is-mine" : ""}`}
            >
              <div className="loom-thread-bubble">
                <div className="loom-row-between">
                  <p className="m-0 text-sm font-semibold">{message.senderName}</p>
                  <p className="m-0 loom-muted small">{new Date(message.createdAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <p className="m-0 mt-2">{message.content}</p>
              </div>
            </article>
          )})}
        </div>
      </section>

      <section className="loom-card p-5">
        <form onSubmit={onSubmit} className="loom-form-stack">
          <label className="loom-field">
            <span>{t("messages.message", "Message")}</span>
            <textarea className="loom-input loom-textarea" value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <button className="loom-button-primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t("common.sending", "Sending...") : t("messages.send", "Send")}
          </button>
          {serverError ? <p className="loom-feedback-error">{serverError}</p> : null}
        </form>
      </section>
    </div>
  );
}
