import webpush from "web-push";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveFamilyContext } from "@/features/families/context";
import { assertProductAdmin } from "@/features/admin/server";
import type { PushEventFlag } from "@/features/admin/types";
import { PUSH_EVENT_CATALOG, type PushEventKey } from "@/features/push/catalog";

type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  expirationTime: z.union([z.number().nullable(), z.null()]).optional(),
  keys: z.object({
    p256dh: z.string().min(1).max(1024),
    auth: z.string().min(1).max(1024)
  })
});

const updatePushEventSchema = z.object({
  eventKey: z.string().min(1),
  isEnabled: z.boolean()
});

function toDisplayName(profile: { full_name: string | null; email: string | null } | undefined) {
  if (!profile) {
    return null;
  }

  return profile.full_name ?? profile.email ?? null;
}

function getPushConfig() {
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.PUSH_VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const config = getPushConfig();
  if (!config) {
    return null;
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return config;
}

export function getPushPublicKey() {
  const config = getPushConfig();
  return config?.publicKey ?? null;
}

export async function savePushSubscription(userId: string, subscriptionInput: unknown, userAgent?: string | null) {
  const parsed = subscribeSchema.parse(subscriptionInput);
  const supabase = await createClient();
  const context = await getActiveFamilyContext(userId);
  const activeFamilyId = context.activeFamilyId ?? null;
  const expirationTime =
    typeof parsed.expirationTime === "number" && Number.isFinite(parsed.expirationTime)
      ? new Date(parsed.expirationTime).toISOString()
      : null;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      family_id: activeFamilyId,
      endpoint: parsed.endpoint,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      expiration_time: expirationTime,
      user_agent: userAgent ?? null,
      last_seen_at: new Date().toISOString()
    },
    {
      onConflict: "endpoint"
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function removePushSubscriptionByEndpoint(userId: string, endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removePushSubscriptionByRecord(record: PushSubscriptionRecord) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", record.endpoint);

  if (error) {
    throw new Error(error.message);
  }
}

export async function isPushEventEnabled(eventKey: PushEventKey): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_event_flags")
    .select("is_enabled")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (error) {
    return true;
  }

  if (!data) {
    return true;
  }

  return Boolean(data.is_enabled);
}

export async function getPushEventFlags(): Promise<PushEventFlag[]> {
  await assertProductAdmin();
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("push_event_flags")
    .select("event_key, is_enabled, updated_at, updated_by");

  if (error) {
    return PUSH_EVENT_CATALOG.map((eventItem) => ({
      eventKey: eventItem.key,
      isEnabled: true,
      updatedAt: null,
      updatedByUserId: null,
      updatedByLabel: null
    }));
  }

  const actorIds = Array.from(
    new Set((rows ?? []).map((row) => row.updated_by).filter((value): value is string => Boolean(value)))
  );

  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", actorIds);
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email
      });
    }
  }

  const rowMap = new Map<string, { is_enabled: boolean; updated_at: string | null; updated_by: string | null }>();
  for (const row of rows ?? []) {
    rowMap.set(row.event_key, {
      is_enabled: Boolean(row.is_enabled),
      updated_at: row.updated_at,
      updated_by: row.updated_by
    });
  }

  return PUSH_EVENT_CATALOG.map((eventItem) => {
    const row = rowMap.get(eventItem.key);
    const updatedByProfile = row?.updated_by ? profileMap.get(row.updated_by) : undefined;
    return {
      eventKey: eventItem.key,
      isEnabled: row?.is_enabled ?? true,
      updatedAt: row?.updated_at ?? null,
      updatedByUserId: row?.updated_by ?? null,
      updatedByLabel: toDisplayName(updatedByProfile)
    };
  });
}

export async function updatePushEventFlag(input: unknown) {
  const parsed = updatePushEventSchema.parse(input);
  const isKnown = PUSH_EVENT_CATALOG.some((eventItem) => eventItem.key === parsed.eventKey);
  if (!isKnown) {
    throw new Error("Unknown push event key");
  }

  const { userId } = await assertProductAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("push_event_flags").upsert(
    {
      event_key: parsed.eventKey,
      is_enabled: parsed.isEnabled,
      updated_by: userId
    },
    {
      onConflict: "event_key"
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

async function sendWebPush(record: PushSubscriptionRecord, payload: PushPayload) {
  const config = configureWebPush();
  if (!config) {
    return;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: record.endpoint,
        keys: {
          p256dh: record.p256dh,
          auth: record.auth
        }
      },
      JSON.stringify({
        ...payload,
        icon: "/icon.png",
        badge: "/brand/loom-symbol.png"
      }),
      {
        TTL: 60
      }
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number } | undefined)?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await removePushSubscriptionByRecord(record).catch(() => null);
      return;
    }

    throw error;
  }
}

export async function sendPushToConversationMembers(
  conversationId: string,
  payload: PushPayload,
  eventKey: PushEventKey = "new_message"
) {
  if (!(await isPushEventEnabled(eventKey))) {
    return;
  }

  const config = configureWebPush();
  if (!config) {
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_push_subscriptions_for_conversation", {
    target_conversation_id: conversationId
  });

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as PushSubscriptionRecord[];
  if (records.length === 0) {
    return;
  }

  for (const record of records) {
    await sendWebPush(record, payload);
  }
}
