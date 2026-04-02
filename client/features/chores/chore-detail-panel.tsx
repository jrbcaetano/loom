"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntityActivityStream } from "@/components/patterns/entity-activity-stream";
import { EntityDetailShell } from "@/components/patterns/entity-detail-shell";
import { EntityDrawerEmptyState, EntityDrawerErrorState, EntityDrawerLoadingState } from "@/components/patterns/entity-drawer-state";
import { EntityAssigneeBadge, EntityMetadataGrid, EntityMetadataItem, EntitySection, EntitySummaryMeta, EntitySummaryMetaItem } from "@/components/patterns/entity-metadata";
import { buildLifecycleActivityEntries } from "@/features/entities/entity-activity-adapters";
import type { EntityDetailRegistryEntryProps } from "@/features/entities/entity-detail-registry";
import { ChoreForm } from "@/features/chores/chore-form";
import { useI18n } from "@/lib/i18n/context";

type ChoreDetail = {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  assigned_to_user_id: string | null;
  points: number;
  due_date: string | null;
  status: "todo" | "done";
  created_at?: string | null;
};

type MemberOption = { userId: string; displayName: string };

async function fetchChore(choreId: string) {
  const response = await fetch(`/api/chores/${choreId}`, { cache: "no-store" });
  const payload = (await response.json()) as { chore?: ChoreDetail | null; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load chore");
  }
  return payload.chore ?? null;
}

export function ChoreDetailPanel({
  itemId,
  routeState,
  close,
  updateRouteState,
  members
}: EntityDetailRegistryEntryProps & { members: MemberOption[] }) {
  const { t, dateLocale } = useI18n();
  const queryClient = useQueryClient();
  const isEditing = routeState.panel === "edit";

  const choreQuery = useQuery({
    queryKey: ["chore-detail", itemId],
    queryFn: () => fetchChore(itemId)
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chores/${itemId}/complete`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t("chores.completeError", "Failed to complete chore"));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chores"] });
      await queryClient.invalidateQueries({ queryKey: ["chore-detail", itemId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chores/${itemId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete chore");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chores"] });
      close();
    }
  });

  const chore = choreQuery.data;
  const assigneeName = members.find((member) => member.userId === chore?.assigned_to_user_id)?.displayName ?? t("tasks.unassigned", "Unassigned");
  const lifecycleEntries = chore
    ? buildLifecycleActivityEntries({
        entityName: t("chores.chore", "Chore"),
        createdAt: chore.created_at ?? new Date().toISOString(),
        updatedAt: chore.created_at ?? new Date().toISOString(),
        authorName: assigneeName
      })
    : [];

  return (
    <EntityDetailShell
      isOpen
      title={chore?.title ?? t("chores.detailTitle", "Chore")}
      eyebrow={t("nav.chores", "Chores & Rewards")}
      subtitle={chore ? `${chore.points} ${t("home.points", "points")}` : undefined}
      summaryMeta={
        chore ? (
          <EntitySummaryMeta>
            <EntitySummaryMetaItem label={t("chores.points", "Points")} value={chore.points} />
            <EntitySummaryMetaItem label={t("tasks.assignee", "Assignee")} value={assigneeName} />
            <EntitySummaryMetaItem label={t("tasks.status", "Status")} value={chore.status} />
            <EntitySummaryMetaItem label={t("tasks.due", "Due")} value={chore.due_date ?? t("common.notSet", "Not set")} />
          </EntitySummaryMeta>
        ) : undefined
      }
      onClose={close}
      headerActions={
        chore ? (
          <div className="loom-inline-actions">
            <button type="button" className="loom-button-ghost" onClick={() => completeMutation.mutate()} disabled={chore.status === "done" || completeMutation.isPending}>
              {chore.status === "done" ? t("tasks.statusDone", "Done") : t("common.complete", "Complete")}
            </button>
            <button type="button" className="loom-button-ghost" onClick={() => updateRouteState({ panel: isEditing ? null : "edit" })}>
              {isEditing ? t("common.cancel", "Cancel") : t("chores.edit", "Edit chore")}
            </button>
            <button type="button" className="loom-task-icon-button" aria-label={t("common.close", "Close")} onClick={close}>
              ??
            </button>
          </div>
        ) : undefined
      }
    >
      {choreQuery.isPending ? <EntityDrawerLoadingState message={t("chores.loading", "Loading chores...")} /> : null}
      {choreQuery.error ? <EntityDrawerErrorState message={choreQuery.error.message} /> : null}
      {!choreQuery.isPending && !choreQuery.error && !chore ? <EntityDrawerEmptyState message={t("common.none", "None")} /> : null}

      {chore ? (
        <>
          <EntitySection title={t("common.details", "Details")}>
            <EntityMetadataGrid>
              <EntityMetadataItem label={t("chores.points", "Points")} value={chore.points} />
              <EntityMetadataItem label={t("tasks.due", "Due")} value={chore.due_date ?? t("common.notSet", "Not set")} />
              <EntityMetadataItem label={t("tasks.status", "Status")} value={chore.status} />
              <EntityMetadataItem label={t("tasks.assignee", "Assignee")} value={<EntityAssigneeBadge value={assigneeName} />} />
            </EntityMetadataGrid>
          </EntitySection>

          <EntitySection title={t("common.description", "Description")}>
            <p className="m-0">{chore.description ?? t("common.noDescription", "No description.")}</p>
          </EntitySection>

          <EntitySection title={t("common.activity", "Activity")}>
            <EntityActivityStream
              entries={lifecycleEntries}
              dateLocale={dateLocale}
              emptyState={<EntityDrawerEmptyState message={t("tasks.noActivity", "No activity yet.")} />}
              countLabel={<span className="loom-home-pill is-muted">{lifecycleEntries.length}</span>}
            />
          </EntitySection>

          {isEditing ? (
            <EntitySection title={t("chores.edit", "Edit chore")}>
              <ChoreForm
                familyId={chore.family_id}
                members={members}
                endpoint={`/api/chores/${chore.id}`}
                method="PATCH"
                submitLabel={t("chores.save", "Save chore")}
                redirectTo="/chores"
                disableRedirect
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["chores"] });
                  queryClient.invalidateQueries({ queryKey: ["chore-detail", chore.id] });
                  updateRouteState({ panel: null });
                }}
                initialValues={{
                  title: chore.title,
                  description: chore.description ?? "",
                  assignedToUserId: chore.assigned_to_user_id ?? "",
                  points: chore.points,
                  dueDate: chore.due_date ?? "",
                  status: chore.status
                }}
              />
              <div className="mt-4">
                <button
                  type="button"
                  className="loom-button-ghost loom-signout-danger"
                  onClick={() => {
                    if (!window.confirm(t("common.deleteConfirm", "Are you sure you want to delete this item?"))) return;
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t("common.deleting", "Deleting...") : t("chores.delete", "Delete chore")}
                </button>
                {deleteMutation.error ? <p className="loom-feedback-error mt-2">{deleteMutation.error.message}</p> : null}
              </div>
            </EntitySection>
          ) : null}
        </>
      ) : null}
    </EntityDetailShell>
  );
}
