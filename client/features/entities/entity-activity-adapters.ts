import type { EntityActivityEntry } from "@/components/patterns/entity-activity-stream";

export type EntityActivitySource = {
  id: string;
  body: string;
  entryKind: "comment" | "audit";
  createdAt: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export function mapEntityActivityEntries(entries: EntityActivitySource[]): EntityActivityEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    body: entry.body,
    entryKind: entry.entryKind,
    createdAt: entry.createdAt,
    authorName: entry.authorName,
    authorAvatarUrl: entry.authorAvatarUrl ?? null,
    metadata: entry.metadata ?? {}
  }));
}

export function buildLifecycleActivityEntries({
  entityName,
  createdAt,
  updatedAt,
  authorName
}: {
  entityName: string;
  createdAt: string;
  updatedAt?: string | null;
  authorName: string;
}) {
  const entries: EntityActivitySource[] = [
    {
      id: `${entityName}-created-${createdAt}`,
      body: `${entityName} created`,
      entryKind: "audit",
      createdAt,
      authorName,
      metadata: {
        fieldLabel: "Status",
        previousValue: null,
        nextValue: "Created"
      }
    }
  ];

  if (updatedAt && updatedAt !== createdAt) {
    entries.push({
      id: `${entityName}-updated-${updatedAt}`,
      body: `${entityName} updated`,
      entryKind: "audit",
      createdAt: updatedAt,
      authorName,
      metadata: {
        fieldLabel: "Status",
        previousValue: "Created",
        nextValue: "Updated"
      }
    });
  }

  return mapEntityActivityEntries(entries);
}
