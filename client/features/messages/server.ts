import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendPushToConversationMembers } from "@/features/push/server";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000)
});

const directConversationSchema = z.object({
  familyId: z.string().uuid(),
  otherUserId: z.string().uuid()
});

export type ConversationSummary = {
  id: string;
  familyId: string;
  type: "family" | "direct";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  memberNames: string[];
};

export type MessageRow = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};

async function getCurrentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return user.id;
}

export async function ensureFamilyConversation(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_family_conversation", {
    target_family_id: familyId
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to ensure family conversation");
  }

  return data as string;
}

export async function createDirectConversation(input: unknown) {
  const parsed = directConversationSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_direct_conversation", {
    target_family_id: parsed.familyId,
    other_user_id: parsed.otherUserId
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create direct conversation");
  }

  return data as string;
}

export async function getConversations(familyId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);

  await ensureFamilyConversation(familyId);

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, family_id, type")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);

  const { data: messages } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("id, conversation_id, sender_user_id, content, created_at, read_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ id: string; conversation_id: string; sender_user_id: string; content: string; created_at: string; read_at: string | null }> };

  const { data: members } = conversationIds.length
    ? await supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", conversationIds)
    : { data: [] as Array<{ conversation_id: string; user_id: string }> };

  const memberUserIds = Array.from(new Set((members ?? []).map((member) => member.user_id)));
  const { data: profiles } = memberUserIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", memberUserIds)
    : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> };

  const profileName = new Map<string, string>();
  for (const profile of profiles ?? []) {
    profileName.set(profile.id, profile.full_name ?? profile.email ?? "Member");
  }

  return (conversations ?? []).map((conversation) => {
    const lastMessage = (messages ?? []).find((message) => message.conversation_id === conversation.id) ?? null;
    const unreadCount = (messages ?? []).filter(
      (message) =>
        message.conversation_id === conversation.id &&
        message.sender_user_id !== currentUserId &&
        message.read_at === null
    ).length;

    const names = (members ?? [])
      .filter((member) => member.conversation_id === conversation.id && member.user_id !== currentUserId)
      .map((member) => profileName.get(member.user_id) ?? "Member");

    return {
      id: conversation.id,
      familyId: conversation.family_id,
      type: conversation.type,
      lastMessage: lastMessage?.content ?? null,
      lastMessageAt: lastMessage?.created_at ?? null,
      unreadCount,
      memberNames: names
    };
  });
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_user_id, content, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const senderIds = Array.from(new Set((data ?? []).map((message) => message.sender_user_id)));
  const { data: profiles, error: profilesError } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", senderIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const senderNames = new Map<string, string>();
  for (const profile of profiles ?? []) {
    senderNames.set(profile.id, profile.full_name ?? profile.email ?? "Member");
  }

  return (data ?? []).map((message) => ({
    id: message.id,
    conversationId: message.conversation_id,
    senderUserId: message.sender_user_id,
    senderName: senderNames.get(message.sender_user_id) ?? "Member",
    content: message.content,
    createdAt: message.created_at,
    readAt: message.read_at
  }));
}

export async function sendMessage(input: unknown) {
  const parsed = sendMessageSchema.parse(input);
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.conversationId,
      sender_user_id: currentUserId,
      content: parsed.content
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", currentUserId)
    .maybeSingle();
  const senderName = profile?.full_name ?? profile?.email ?? "Family member";

  void sendPushToConversationMembers(parsed.conversationId, {
    title: "New message",
    body: `${senderName}: ${parsed.content.slice(0, 120)}`,
    url: `/messages/${parsed.conversationId}`,
    tag: `message-${parsed.conversationId}`
  }).catch(() => null);

  return data.id;
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", {
    target_conversation_id: conversationId
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUnreadMessagesCount(familyId: string): Promise<number> {
  const supabase = await createClient();
  const currentUserId = await getCurrentUserId(supabase);

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id")
    .eq("family_id", familyId);

  if (conversationsError) {
    throw new Error(conversationsError.message);
  }

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  if (conversationIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .neq("sender_user_id", currentUserId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
