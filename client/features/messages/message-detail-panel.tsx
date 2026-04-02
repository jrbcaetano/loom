"use client";

import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState } from "@/components/patterns/entity-drawer-state";
import {
  EntityAssigneeBadge,
  EntityMetadataGrid,
  EntityMetadataItem,
  EntitySection,
  EntitySummaryMeta,
  EntitySummaryMetaItem
} from "@/components/patterns/entity-metadata";
import { MessageThreadClient } from "@/features/messages/thread-client";
import type { ConversationSummary } from "@/features/messages/messages-client";
import type { EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { useI18n } from "@/lib/i18n/context";

export function MessageDetailPanel({
  itemId,
  close,
  currentUserId,
  conversation
}: EntityDetailRegistryEntryProps & {
  currentUserId: string;
  conversation: ConversationSummary | null;
}) {
  const { t, dateLocale } = useI18n();
  const title = conversation
    ? conversation.type === "family"
      ? t("messages.familyChat", "Family chat")
      : conversation.memberNames.join(", ")
    : t("messages.conversation", "Conversation");

  return (
    <EntityDetailShell
      isOpen
      title={title}
      eyebrow={t("nav.messages", "Messages")}
      subtitle={
        conversation ? (
          <>
            {conversation.lastMessageAt
              ? new Date(conversation.lastMessageAt).toLocaleString(dateLocale)
              : t("messages.noMessagesYet", "No messages yet")}
          </>
        ) : undefined
      }
      badge={
        conversation ? (
          <span className="loom-home-pill is-muted m-0">
            {conversation.unreadCount > 0
              ? `${conversation.unreadCount} ${t("messages.unread", "unread")}`
              : t("messages.read", "Read")}
          </span>
        ) : undefined
      }
      summaryMeta={
        conversation ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("messages.type", "Type")} value={conversation.type === "family" ? t("messages.familyChat", "Family chat") : t("messages.direct", "Direct")} />
            <EntitySummaryMetaItem label={t("messages.participants", "Participants")} value={conversation.type === "family" ? t("messages.familyParticipants", "Entire family") : conversation.memberNames.length} />
            <EntitySummaryMetaItem label={t("messages.lastActivity", "Last activity")} value={conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleDateString(dateLocale) : t("common.none", "None")} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
    >
      {conversation ? (
        <>
          <EntitySection title={t("common.details", "Details")}>
            <EntityMetadataGrid>
              <EntityMetadataItem
                label={t("messages.type", "Type")}
                value={conversation.type === "family" ? t("messages.familyChat", "Family chat") : t("messages.direct", "Direct")}
              />
              <EntityMetadataItem
                label={t("messages.participants", "Participants")}
                value={
                  conversation.type === "family"
                    ? t("messages.familyParticipants", "Entire family")
                    : <EntityAssigneeBadge value={conversation.memberNames.join(", ") || t("common.unknown", "Unknown")} />
                }
              />
              <EntityMetadataItem
                label={t("messages.lastActivity", "Last activity")}
                value={
                  conversation.lastMessageAt
                    ? new Date(conversation.lastMessageAt).toLocaleString(dateLocale)
                    : t("messages.noMessagesYet", "No messages yet")
                }
              />
              <EntityMetadataItem
                label={t("messages.status", "Status")}
                value={conversation.unreadCount ? `${conversation.unreadCount} ${t("messages.unread", "unread")}` : t("messages.read", "Read")}
              />
            </EntityMetadataGrid>
          </EntitySection>

          <EntitySection title={t("messages.thread", "Thread")}>
            <MessageThreadClient conversationId={itemId} currentUserId={currentUserId} />
          </EntitySection>
        </>
      ) : (
        <EntityDrawerEmptyState message={t("common.none", "None")} />
      )}
    </EntityDetailShell>
  );
}

